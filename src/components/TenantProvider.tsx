import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tenant } from '../../types';

interface TenantContextType {
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ tenantId?: string; children: React.ReactNode }> = ({ tenantId, children }) => {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId) {
            setLoading(false);
            return;
        }

        const fetchTenant = async () => {
            try {
                const { data, error } = await supabase
                    .from('saas_tenants')
                    .select('*')
                    .eq('id', tenantId)
                    .single();

                if (error) throw error;
                setTenant(data);
            } catch (err: any) {
                console.error('Error fetching tenant:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTenant();
    }, [tenantId]);

    return (
        <TenantContext.Provider value={{ tenant, loading, error }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
