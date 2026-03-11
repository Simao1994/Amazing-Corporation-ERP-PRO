import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Função para obter o URL base (com suporte opcional a bypass de proxy via URL query)
const getBaseURL = () => {
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('direct') === 'true') {
            return supabaseUrl || '';
        }

        // Ativar proxy inteligente apenas quando rodando localmente (Vite Bypass)
        // O uso relativo `/sbapi` delega o redirecionamento ao Vite, fintando os blocos restritos
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '/sbapi';
        }
    }
    return supabaseUrl || '';
};

const finalUrl = getBaseURL();

if (!finalUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não encontradas!');
}

// Sistema de Lock em memória para contornar o bug do Navigator LockManager no gotrue-js
// Implementação robusta: não forma fila infinita — cada operação corre de forma independente
// e o lock é reiniciado automaticamente após qualquer falha.
let memoryLockQueue: Promise<any> = Promise.resolve();

const memoryLockFunc = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    // Timeout generoso: operações de auth como refresh podem demorar em redes lentas
    const timeoutMs = Math.max(acquireTimeout || 0, 30000);

    const runWithTimeout = (): Promise<R> => {
        return new Promise<R>((resolve, reject) => {
            const timer = setTimeout(() => {
                console.warn(`[MemoryLock] Timeout após ${timeoutMs}ms para '${name}'. Reiniciando lock.`);
                // Resetar a fila para evitar que operações futuras fiquem presas
                memoryLockQueue = Promise.resolve();
                reject(new Error(`Auth Lock Timeout: ${name}`));
            }, timeoutMs);

            fn().then(
                (result) => { clearTimeout(timer); resolve(result); },
                (err) => { clearTimeout(timer); reject(err); }
            );
        });
    };

    // Encadear na fila, mas garantir que erros anteriores não bloqueiam novas operações
    const current = memoryLockQueue.then(runWithTimeout, runWithTimeout);
    // Fila avança mesmo que esta operação falhe
    memoryLockQueue = current.catch(() => { });
    return current;
};

export const supabase = createClient(finalUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'sb-amazing-erp-pro-auth-token',
        lock: memoryLockFunc
    }
});

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
