import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Função para obter o URL base (com suporte opcional a bypass de proxy via URL query)
 */
const getBaseURL = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);

        // Check for manual override
        const forceDirect = urlParams.get('direct') === 'true';
        const forceProxy = urlParams.get('proxy') === 'true';

        if (forceDirect) return supabaseUrl || '';
        if (forceProxy) return '/sbapi';

        const hostname = window.location.hostname;

        // Ativar proxy inteligente para localhost, IPs locais, ou se o URL explicitamente indicar porta 3000/5173
        const isLocal = hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            window.location.port === '3000' ||
            window.location.port === '5173' ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

        if (isLocal) {
            console.log(`[Supabase CLIENT] Ambiente local/dev detectado (${hostname}). Usando Proxy /sbapi`);
            return '/sbapi';
        }
    }
    return supabaseUrl || '';
};

const finalUrl = getBaseURL();

if (!finalUrl || !supabaseAnonKey) {
    console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase (URL/KEY) não encontradas!');
} else {
    console.log(`[Supabase CONFIG] URL: ${finalUrl}, Proxy: ${finalUrl === '/sbapi'}`);
}

// Sistema de Lock Robusto — Coordenado por LockManager (se disponível) ou Memória (Fallback)
let activeLock: Promise<any> | null = null;
 
const memoryLockFunc = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    // 1. Tentar LockManager nativo para consistência multi-aba (Supabase default)
    if (typeof navigator !== 'undefined' && navigator.locks) {
        try {
            return await navigator.locks.request(name, { steal: false, ifAvailable: false }, async () => {
                return await fn();
            });
        } catch (err) {
            console.warn('[Auth Lock] LockManager falhou, usando fallback em memória:', err);
        }
    }
 
    // 2. Fallback: Lock Sequencial em Memória
    if (activeLock) {
        try {
            await activeLock;
        } catch (e) { }
    }
 
    const operation = fn();
    activeLock = operation;
 
    try {
        return await operation;
    } finally {
        if (activeLock === operation) activeLock = null;
    }
};

/**
 * Singleton: Cliente Supabase
 * Criado fora de componentes para evitar múltiplas instâncias.
 */
export const supabase = createClient(finalUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-amazing-erp-pro-auth-token',
        lock: memoryLockFunc
    },
    global: {
        headers: { 'x-application-name': 'amazing-erp-pro' },
        fetch: (url, options) => {
            return fetch(url, {
                ...options,
                // @ts-ignore - Some environments support signal or timeout directly in fetch options
                timeout: 30000
            });
        }
    },
    db: {
        schema: 'public'
    }
});

/**
 * Monitorização de conectividade
 */
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => console.log('[Network] Conexão restaurada (Online).'));
    window.addEventListener('offline', () => console.error('[Network] Conexão perdida (Offline)!'));

    // Log de estado inicial
    console.log('[Supabase] Cliente inicializado com sucesso.', {
        url: finalUrl,
        mode: finalUrl === '/sbapi' ? 'Proxy' : 'Direct'
    });
}
