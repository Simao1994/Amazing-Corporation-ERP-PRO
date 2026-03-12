import { useEffect, useRef } from 'react';
import { realtimeManager } from '../lib/realtimeManager';

/**
 * Hook para sincronizar dados em tempo real com o Supabase.
 * @param table Nome da tabela para subscrever
 * @param tenantId ID da empresa para filtrar eventos (opcional)
 * @param callback Função a ser executada quando ocorrer uma alteração (INSERT, UPDATE, DELETE)
 */
export function useRealtimeSync(
    table: string,
    tenantId: string | undefined,
    callback: () => void
) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        if (!tenantId || !table) return;

        console.log(`[Realtime] Solicitando sincronização para: ${table} (Tenant: ${tenantId})`);

        const unsubscribe = realtimeManager.subscribe(table, tenantId, () => {
            callbackRef.current();
        });

        return () => {
            unsubscribe();
        };
    }, [table, tenantId]);
}
