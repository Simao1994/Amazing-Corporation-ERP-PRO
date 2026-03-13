import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { safeQuery } from '../lib/supabaseUtils';
import { checkSubscription } from '../utils/subscription';
import { SubscriptionStatus, SaasConfig } from '../../types';
import { useAuth } from './AuthContext';

interface SaaSContextType {
    subscription: SubscriptionStatus | null;
    loading: boolean;
    refreshSubscription: () => Promise<void>;
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [saasConfig, setSaasConfig] = useState<any>(null);
    const userRef = useRef<any>(null);
    const isFetching = useRef(false);

    // Actualização síncrona
    userRef.current = user;

    const refreshSubscription = useCallback(async () => {
        if (isFetching.current) return;

        console.log('[SaaS] refreshSubscription iniciado', { hasUser: !!userRef.current });
        const currentUser = userRef.current;
        if (!currentUser) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        isFetching.current = true;
        setLoading(true);

        try {
            const effectiveRole = currentUser.role;
            const jwtTenantId = currentUser.app_metadata?.tenant_id || currentUser.user_metadata?.tenant_id;
            const effectiveTenantId = currentUser.tenant_id || jwtTenantId;

            console.log('SaaSContext: Checking subscription for:', { role: effectiveRole, tenant_id: effectiveTenantId });

            // JWT-First: saas_admin has special properties and bypasses DB checks
            if (effectiveRole === 'saas_admin') {
                console.log('[SaaS] Admin detectado pelo JWT. Concedendo acesso total instantâneo.');
                const adminSub: SubscriptionStatus = {
                    id: 'master-admin',
                    tenant_id: 'master-tenant',
                    active: true,
                    plan_id: 'master-plan-id',
                    daysLeft: 999,
                    status: 'ativo',
                    modules: ['ALL', 'RH', 'PONTO', 'FINANCEIRO', 'CONTABILIDADE', 'LOGISTICA', 'INVENTARIO', 'IMOBILIARIO', 'CRM', 'VAGAS', 'ARENA', 'AGRO', 'BLOG', 'EMPRESAS'],
                    features: ['Acesso Total Vitalício', 'Suporte Prioritário', 'Utilizadores Ilimitados'],
                    maxUsers: 999,
                    valor_pago: 0,
                    data_inicio: new Date().toISOString(),
                    data_expiracao: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                    auto_renew: true,
                    saas_plans: {
                        id: 'master-plan-id',
                        nome: 'Master Administrator',
                        valor: 0,
                        duracao_meses: 120,
                        max_users: 9999,
                        modules: ['ALL'],
                        features: ['Acesso Total', 'Gestão de Infraestrutura']
                    }
                };

                setSubscription(prev => JSON.stringify(prev) === JSON.stringify(adminSub) ? prev : adminSub);
                setLoading(false);
                return;
            }

            if (effectiveTenantId) {
                const status = await checkSubscription(effectiveTenantId);
                setSubscription(prev => JSON.stringify(prev) === JSON.stringify(status) ? prev : status);

                const { data: config, error: configError } = await safeQuery<SaasConfig>(
                    () => supabase.from('saas_config').select('*').eq('id', 1).single(),
                    { cacheKey: 'saas-config', cacheTTL: 300000 }
                );

                if (config && !configError) {
                    setSaasConfig(config);
                }
            } else {
                setSubscription(null);
            }
        } catch (error: any) {
            console.error('Erro ao verificar subscrição:', error);
            if (userRef.current?.role === 'saas_admin') {
                // Fallback de emergência para admin
                setSubscription(prev => prev || { active: true, modules: ['ALL'] } as any);
            } else {
                setSubscription(null);
            }
        } finally {
            isFetching.current = false;
            setLoading(false);
        }
    }, []); // Estável

    useEffect(() => {
        const failSafe = setTimeout(() => {
            setLoading(current => {
                if (current) {
                    console.error('SaaSContext: FAIL-SAFE disparado após 5s!');
                    // Tentativa de recuperação para admins
                    if (userRef.current?.role === 'saas_admin') {
                        setSubscription({ active: true, modules: ['ALL'] } as any);
                    }
                    return false;
                }
                return current;
            });
        }, 5000); // Reduzido de 10s para 5s

        if (!authLoading) {
            console.log('[SaaS] Auth pronto, carregando subscrição...');
            refreshSubscription().finally(() => {
                clearTimeout(failSafe);
            });
        } else {
            console.log('[SaaS] Aguardando Auth finalizar...');
        }

        return () => clearTimeout(failSafe);
    }, [user, authLoading]);

    const saasValue = React.useMemo(() => ({
        subscription,
        loading,
        refreshSubscription
    }), [subscription, loading]);

    return (
        <SaaSContext.Provider value={saasValue}>
            {children}
        </SaaSContext.Provider>
    );
};

export const useSaaS = () => {
    const context = useContext(SaaSContext);
    if (context === undefined) {
        throw new Error('useSaaS must be used within a SaaSProvider');
    }
    return context;
};
