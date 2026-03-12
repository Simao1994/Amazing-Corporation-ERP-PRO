import React, { createContext, useContext, useEffect, useState } from 'react';
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

    const refreshSubscription = async () => {
        if (!user) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        try {
            const effectiveRole = user.role;
            const effectiveTenantId = user.tenant_id;

            console.log('SaaSContext: User data from AuthContext:', { role: user.role, tenant_id: user.tenant_id });

            // saas_admin has special properties (active by default, access to all)
            if (effectiveRole === 'saas_admin') {
                console.log('SaaSContext: Activating simulated plan for saas_admin');
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
                console.log('SaaSContext: Checking subscription for tenant:', effectiveTenantId);

                // Timeout protection for subscription check (10 seconds)
                const subPromise = checkSubscription(effectiveTenantId);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Subscription check timeout')), 10000)
                );

                const status = await Promise.race([subPromise, timeoutPromise]) as SubscriptionStatus;

                console.log('SaaSContext: Subscription status:', status);
                setSubscription(prev => JSON.stringify(prev) === JSON.stringify(status) ? prev : status);

                // Buscar configurações globais
                const { data: config, error: configError } = await safeQuery<SaasConfig>(
                    () => supabase.from('saas_config').select('*').eq('id', 1).single(),
                    { cacheKey: 'saas-config', cacheTTL: 300000 } // Cache por 5 min
                );

                if (configError) {
                    console.error('SaaSContext: Error fetching saas_config:', configError);
                } else if (config) {
                    setSaasConfig(config);
                }

            } else {
                console.warn('SaaSContext: No tenant_id found for user. Subscription set to null.');
                setSubscription(null);
            }
        } catch (error: any) {
            console.error('Erro ao verificar subscrição:', error);
            // Em caso de erro crítico, não bloqueamos o admin se ele já tiver o role
            if (user?.role === 'saas_admin') {
                setSubscription({
                    id: 'saas-admin-fallback',
                    tenant_id: user.tenant_id || 'saas-admin-fallback-tenant',
                    active: true,
                    plan_id: 'master-plan-id',
                    daysLeft: 999,
                    status: 'ativo',
                    modules: ['ALL'],
                    features: ['Emergency Fallback Access'],
                    maxUsers: 999,
                    valor_pago: 0,
                    data_inicio: new Date().toISOString(),
                    data_expiracao: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                    auto_renew: true,
                    saas_plans: {
                        id: 'master-plan-id',
                        nome: 'Master Administrator Fallback',
                        valor: 0,
                        duracao_meses: 120,
                        max_users: 9999,
                        modules: ['ALL'],
                        features: ['Acesso Total', 'Gestão de Infraestrutura']
                    }
                });
            } else {
                // For non-admins, set subscription to null on error
                setSubscription(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const failSafe = setTimeout(() => {
            setLoading(current => {
                if (current) {
                    console.error('SaaSContext: FAIL-SAFE disparado!');
                    return false;
                }
                return current;
            });
        }, 10000);

        if (!authLoading) {
            refreshSubscription().finally(() => {
                clearTimeout(failSafe);
            });
        }

        return () => clearTimeout(failSafe);
    }, [user, authLoading]);

    return (
        <SaaSContext.Provider value={{ subscription, loading: loading, refreshSubscription }}>
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
