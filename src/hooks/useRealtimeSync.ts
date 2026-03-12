import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

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

        console.log(`[Realtime] Subscrevendo a alterações na tabela: ${table} (Tenant: ${tenantId})`);

        const channel = supabase
            .channel(`realtime:${table}:${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Ouvir INSERT, UPDATE e DELETE
                    schema: 'public',
                    table: table,
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    console.log(`[Realtime] Alteração detectada em ${table}:`, payload.eventType);
                    callbackRef.current();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[Realtime] Subscrito com sucesso a ${table}`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`[Realtime] Erro ao subscrever a ${table}`);
                }
            });

        return () => {
            console.log(`[Realtime] Cancelando subscrição de ${table}`);
            supabase.removeChannel(channel);
        };
    }, [table, tenantId]);
}
