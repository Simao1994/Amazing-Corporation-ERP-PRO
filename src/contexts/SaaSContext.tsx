import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkSubscription, SubscriptionStatus } from '../utils/subscription';

interface SaaSContextType {
    subscription: SubscriptionStatus | null;
    loading: boolean;
    refreshSubscription: () => Promise<void>;
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const [isFirstLoad, setIsFirstLoad] = useState(true);

    const refreshSubscription = async () => {
        // Prevent concurrent refreshes
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                setSubscription(null);
                setLoading(false);
                return;
            }

            // Fetch profile for tenant_id and role
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id, role')
                .eq('id', user.id)
                .single();

            // saas_admin has special properties (active by default, access to all)
            if (profile?.role === 'saas_admin') {
                const adminSub: SubscriptionStatus = {
                    id: 'saas-admin-unlimited',
                    tenant_id: profile?.tenant_id || 'saas-admin-tenant',
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

            if (profile?.tenant_id) {
                const status = await checkSubscription(profile.tenant_id);
                setSubscription(prev => JSON.stringify(prev) === JSON.stringify(status) ? prev : status);
            } else {
                setSubscription(null);
            }
        } catch (err) {
            console.error('SaaS Context Error:', err);
        } finally {
            setLoading(false);
            setIsFirstLoad(false);
        }
    };

    useEffect(() => {
        // Initial load
        refreshSubscription();
    }, []);

    return (
        <SaaSContext.Provider value={{ subscription, loading, refreshSubscription }}>
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
