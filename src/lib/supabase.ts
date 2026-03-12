import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Função para obter o URL base (com suporte opcional a bypass de proxy via URL query)
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

console.log('[Supabase] Initializing client...', {
    envUrl: supabaseUrl,
    finalUrl,
    hasAnonKey: !!supabaseAnonKey,
    origin: typeof window !== 'undefined' ? window.location.origin : 'SSR'
});

if (!finalUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não encontradas!');
}

// Sistema de Lock em memória — substitui o Navigator LockManager do gotrue-js
// Garante que só UMA operação de auth corre por vez, sem fila infinita.
let activeLock: Promise<any> | null = null;

const memoryLockFunc = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    // Se já houver um lock ativo, para evitar loops infinitos ou esperas que travam o UI,
    // tentamos aguardar apenas por um curto período (2s) antes de forçar a execução.
    // O Gotrue-js usa locks para seqüencializar refresh de tokens e persistência.

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

// Singleton: Cliente Supabase
export const supabase = createClient(finalUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
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

// --- SISTEMA DE LOGS E MONITORIZAÇÃO DE CONEXÃO ---
if (typeof window !== 'undefined') {
    console.log('[Supabase Connectivity] Monitorização iniciada.');

    supabase.auth.onAuthStateChange((event, session) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[Supabase Auth][${timestamp}] Evento: ${event}`, {
            hasSession: !!session,
            userId: session?.user?.id
        });

        if (event === 'SIGNED_OUT') {
            console.warn('[Supabase Auth] Sessão encerrada. Verifique se isto foi esperado.');
        }
    });

    // Monitorizar estado da rede
    window.addEventListener('online', () => console.log('[Network] Conexão restaurada (Online).'));
    window.addEventListener('offline', () => console.error('[Network] Conexão perdida (Offline)! El sistema entrará em modo de espera.'));
}

// --- HELPER PARA CONSULTAS SEGURAS (RECONEXÃO E TRATAMENTO) ---
export async function safeQuery<T>(
    queryFn: () => PromiseLike<{ data: T | null; error: any }>,
    retries = 3,
    delay = 1000
): Promise<{ data: T | null; error: any }> {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
        try {
            // @ts-ignore - Supabase return types match the structure but TS sometimes asks for more Promise methods
            const { data, error } = await queryFn();

            if (!error) return { data, error: null };

            lastError = error;

            // Se for erro de rede (fetch failed, network error, timeout de gateway)
            const errorMsg = error?.message?.toLowerCase() || '';
            const isNetworkError = errorMsg.includes('fetch') ||
                errorMsg.includes('network') ||
                errorMsg.includes('failed to fetch') ||
                error?.code === 'PGRST301' || // JWT expirado
                error?.status === 504 || // Gateway Timeout
                error?.status === 502;   // Bad Gateway

            if (!isNetworkError) break; // Erros lógicos (403 RLS, 404, 400) não devem ter retry

            console.warn(`[Supabase SafeQuery] Tentativa ${i + 1}/${retries} falhou. Re-tentando em ${delay}ms...`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        } catch (err: any) {
            lastError = err;
            const errLower = err?.message?.toLowerCase() || '';
            if (errLower.includes('fetch') || errLower.includes('network')) {
                console.warn(`[Supabase SafeQuery] Erro de rede na tentativa ${i + 1}/${retries}:`, err.message);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                continue;
            }
            break;
        }
    }

    return { data: null, error: lastError };
}

export async function getUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    return { data, error };
}

export async function uploadBlogMedia(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('blog-media')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('blog-media')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

export async function uploadMultipleBlogMedia(files: FileList | File[]) {
    const uploadPromises = Array.from(files).map(file => uploadBlogMedia(file));
    return Promise.all(uploadPromises);
}
