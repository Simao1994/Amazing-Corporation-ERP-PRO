import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Função para obter o URL base (com suporte opcional a bypass de proxy via URL query)
 */
const getBaseURL = () => {
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('direct') === 'true') {
            console.log('[Supabase] Forçando conexão direta via URL param');
            return supabaseUrl || '';
        }

        const hostname = window.location.hostname;
        // Ativar proxy inteligente para localhost, 127.0.0.1 ou IPs locais (192.168.x.x, 10.x.x.x, 172.x.x.x)
        const isLocal = hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

        if (isLocal) {
            console.log(`[Supabase] Ambiente local detectado (${hostname}). Usando Proxy /sbapi`);
            return '/sbapi';
        }
    }
    return supabaseUrl || '';
};

const finalUrl = getBaseURL();

if (!finalUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não encontradas!');
}

// Sistema de Lock em memória — substitui o Navigator LockManager do gotrue-js
let activeLock: Promise<any> | null = null;

const memoryLockFunc = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    if (activeLock) {
        console.warn(`[Auth Lock] Pedido concorrente detectado para: ${name}. Tentando aguardar...`);
        const waitPromise = new Promise(resolve => setTimeout(resolve, Math.min(2000, acquireTimeout)));
        await Promise.race([activeLock.catch(() => { }), waitPromise]);
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
        headers: { 'x-application-name': 'amazing-erp-pro' }
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
