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

    const refreshSubscription = async () => {
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
                setSubscription({
                    id: 'saas-admin-unlimited',
                    tenant_id: profile?.tenant_id || 'saas-admin-tenant',
                    active: true,
                    status: 'ativo',
                    daysLeft: 9999,
                    modules: ['ALL'],
                    maxUsers: 9999,
                    valor_pago: 0,
                    data_inicio: new Date().toISOString(),
                    data_expiracao: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(), // 10 years
                    auto_renew: true,
                    saas_plans: {
                        nome: 'Master Admin Plan',
                        valor: 0,
                        duracao_meses: 120,
                        max_users: 9999,
                        modules: ['ALL'],
                        features: ['Acesso Total', 'Gestão de Infraestrutura']
                    }
                });
                setLoading(false);
                return;
            }

            if (profile?.tenant_id) {
                const status = await checkSubscription(profile.tenant_id);
                setSubscription(status);
            } else {
                setSubscription(null);
            }
        } catch (err) {
            console.error('SaaS Context Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial load
        refreshSubscription();

        // Listen for auth changes to re-fetch subscription
        const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                await refreshSubscription();
            } else if (event === 'SIGNED_OUT') {
                setSubscription(null);
                setLoading(true); // Reset loading state for next login
            }
        });

        return () => {
            authListener.unsubscribe();
        };
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
