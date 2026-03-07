import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkSubscription, SubscriptionStatus } from '../utils/subscription';
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
                    id: 'saas-admin-unlimited',
                    tenant_id: effectiveTenantId || 'saas-admin-tenant',
                    active: true,
                    status: 'ativo',
                    daysLeft: 9999,
                    modules: ['ALL'],
                    maxUsers: 9999,
                    valor_pago: 0,
                    data_inicio: new Date().toISOString(),
                    data_expiracao: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
                    auto_renew: true,
                    saas_plans: {
                        id: 'plan-master-admin',
                        nome: 'Master Admin Plan',
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
                    setTimeout(() => reject(new Error('Subscription check timeout')), 3000)
                );

                const status = await Promise.race([subPromise, timeoutPromise]) as SubscriptionStatus;

                console.log('SaaSContext: Subscription status:', status);
                setSubscription(prev => JSON.stringify(prev) === JSON.stringify(status) ? prev : status);
            } else {
                console.warn('SaaSContext: No tenant_id found for user. Subscription set to null.');
                setSubscription(null);
            }
        } catch (err: any) {
            console.error('SaaS Context Error:', err);
            // Even on error, we must allow the app to load (error handling will happen in components)
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // FAIL-SAFE: Parar carregamento do SaaS em 6 segundos no máximo
        const failSafe = setTimeout(() => {
            if (loading) {
                console.error('SaaSContext: FAIL-SAFE disparado!');
                setLoading(false);
            }
        }, 3000);

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
