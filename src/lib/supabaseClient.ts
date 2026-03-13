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
    // Override: navigator.locks has proven to be unstable with Supabase's session auto-refresh in this Vite setup,
    // leading to "Navigator LockManager lock timed out" errors and false SIGNED_OUT events.
    // Forçando apenas o fallback sequencial em memória:
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

// Storage Handler Robusto para evitar falhas silenciosas do localStorage que limpam a sessão
const robustStorage = {
    getItem: (key: string): string | null => {
        try {
            const val = window.localStorage.getItem(key);
            if (!val) console.warn(`[Supabase Storage] Chave ${key} não encontrada no localStorage.`);
            return val;
        } catch (e) {
            console.error('[Supabase Storage] Erro ao Ler localStorage:', e);
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            console.error('[Supabase Storage] Erro ao Escrever no localStorage:', e);
        }
    },
    removeItem: (key: string): void => {
        try {
            console.trace(`[Supabase Storage] ATENÇÃO: Remoção solicitada da chave ${key}`);
            window.localStorage.removeItem(key);
        } catch (e) {
            console.error('[Supabase Storage] Erro ao Apagar no localStorage:', e);
        }
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
        storage: typeof window !== 'undefined' ? robustStorage : undefined,
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
