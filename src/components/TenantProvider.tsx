import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { safeQuery } from '../lib/supabaseUtils';
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
            console.log(`[Tenant] Iniciando busca para ID: ${tenantId}...`);
            try {
                const { data, error: queryError } = await safeQuery<Tenant>(
                    () => supabase
                        .from('saas_tenants')
                        .select('*')
                        .eq('id', tenantId)
                        .single(),
                    { cacheKey: `tenant-${tenantId}`, cacheTTL: 600000 }
                );

                if (queryError) {
                    console.error('[Tenant] Erro na consulta:', queryError);
                    throw queryError;
                }

                console.log('[Tenant] Sucesso ao carregar:', data?.nome || 'Sem Nome');
                setTenant(data);
            } catch (err: any) {
                console.error('[Tenant] Falha total ao buscar:', err);
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
