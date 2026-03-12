import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/**
 * Gestor de Canais Realtime
 * Evita a criação múltipla de canais para a mesma tabela/tenant e gerencia o ciclo de vida.
 */
class RealtimeManager {
    private channels = new Map<string, {
        channel: RealtimeChannel;
        listeners: Set<() => void>;
    }>();

    /**
     * Subscreve a uma tabela/tenant
     */
    subscribe(table: string, tenantId: string, callback: () => void) {
        const key = `${table}:${tenantId}`;

        if (this.channels.has(key)) {
            const entry = this.channels.get(key)!;
            entry.listeners.add(callback);
            console.log(`[RealtimeManager] Reutilizando canal: ${key} (Total: ${entry.listeners.size})`);
            return () => this.unsubscribe(key, callback);
        }

        console.log(`[RealtimeManager] Criando novo canal: ${key}`);

        const channel = supabase.channel(`rt:${key}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    console.log(`[RealtimeManager] Evento em ${key}:`, payload.eventType);
                    const entry = this.channels.get(key);
                    if (entry) {
                        entry.listeners.forEach(cb => cb());
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[RealtimeManager] Canal activo: ${key}`);
                }
            });

        this.channels.set(key, {
            channel,
            listeners: new Set([callback])
        });

        return () => this.unsubscribe(key, callback);
    }

    /**
     * Remove um listener e limpa o canal se estiver vazio
     */
    private unsubscribe(key: string, callback: () => void) {
        const entry = this.channels.get(key);
        if (!entry) return;

        entry.listeners.delete(callback);
        console.log(`[RealtimeManager] Listener removido de ${key} (Restantes: ${entry.listeners.size})`);

        if (entry.listeners.size === 0) {
            console.log(`[RealtimeManager] Fechando canal vazio: ${key}`);
            supabase.removeChannel(entry.channel);
            this.channels.delete(key);
        }
    }
}

export const realtimeManager = new RealtimeManager();
