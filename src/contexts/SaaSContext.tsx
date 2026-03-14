import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { safeQuery } from '../lib/supabaseUtils';
import { checkSubscription } from '../utils/subscription';
import { SubscriptionStatus, SaasConfig } from '../../types';
import { useAuth } from './AuthContext';

interface SaaSContextType {
    subscription: SubscriptionStatus | null;
    tenant: any | null;
    saasConfig: SaasConfig | null;
    loading: boolean;
    refreshSubscription: () => Promise<void>;
    isModuleActive: (moduleName: string) => boolean;
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [tenant, setTenant] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [saasConfig, setSaasConfig] = useState<SaasConfig | null>(null);
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

            console.log('SaaSContext: Checking data for:', { role: effectiveRole, tenant_id: effectiveTenantId });

            // 1. Fetch Tenant Details & Config in parallel
            const fetchOperations: Promise<any>[] = [];

            if (effectiveTenantId) {
                fetchOperations.push(
                    safeQuery(() => supabase.from('saas_tenants').select('*').eq('id', effectiveTenantId).single(),
                        { cacheKey: `tenant-${effectiveTenantId}`, cacheTTL: 600000 })
                );
                fetchOperations.push(checkSubscription(effectiveTenantId));
            }

            fetchOperations.push(
                safeQuery<SaasConfig>(
                    () => supabase.from('saas_config').select('*').eq('id', 1).single(),
                    { cacheKey: 'saas-config', cacheTTL: 300000 }
                )
            );

            // JWT-First: saas_admin has special properties and bypasses DB checks for speed
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

                setSubscription(adminSub);
                setTenant({ id: 'master-tenant', nome: 'Amazing HQ', slug: 'master' });
                setLoading(false);

                // Still load config in background
                const configRes = await safeQuery<SaasConfig>(
                    () => supabase.from('saas_config').select('*').eq('id', 1).single(),
                    { cacheKey: 'saas-config', cacheTTL: 300000 }
                );
                if (configRes.data) setSaasConfig(configRes.data);

                return;
            }

            const results = await Promise.all(fetchOperations);

            if (effectiveTenantId) {
                const [tenantRes, subStatus, configRes] = results;
                if (tenantRes.data) setTenant(tenantRes.data);
                if (subStatus) setSubscription(subStatus);
                if (configRes.data) setSaasConfig(configRes.data);
            } else {
                const [configRes] = results;
                if (configRes.data) setSaasConfig(configRes.data);
                setSubscription(null);
                setTenant(null);
            }
        } catch (error: any) {
            console.error('Erro ao verificar subscrição/tenant:', error);
            if (userRef.current?.role === 'saas_admin') {
                setSubscription({ active: true, modules: ['ALL'] } as any);
            } else {
                setSubscription(null);
                setTenant(null);
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

    const isModuleActive = useCallback((moduleName: string): boolean => {
        if (!subscription?.active) return false;
        return subscription.modules.some(m => m.toUpperCase() === moduleName.toUpperCase())
            || subscription.modules.some(m => m.toUpperCase() === 'ALL');
    }, [subscription]);

    const saasValue = React.useMemo(() => ({
        subscription,
        tenant,
        saasConfig,
        loading,
        refreshSubscription,
        isModuleActive
    }), [subscription, tenant, saasConfig, loading, refreshSubscription, isModuleActive]);

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
