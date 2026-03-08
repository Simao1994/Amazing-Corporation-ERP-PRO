
import { createClient } from '@supabase/supabase-js'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Revertido o bypass de proxy por causa do bug de KEEP-ALIVE do Node.js (ECONNRESET)
const getBaseURL = () => {
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('direct') === 'true') {
            console.warn('[Supabase] Forçando ligação direta (ignore proxy /sbapi)');
            return import.meta.env.VITE_SUPABASE_URL || '';
        }
        return window.location.origin;
    }
    return import.meta.env.VITE_SUPABASE_URL || '';
};

const supabaseUrl = getBaseURL().includes('supabase.co')
    ? getBaseURL()
    : getBaseURL() + '/sbapi';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não encontradas! Verifique o ficheiro .env.local');
}

const MAX_RETRIES = 1;

const customFetch: typeof fetch = async (url, options) => {
    let lastError: any;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            return await new Promise<Response>((resolve, reject) => {
                let isSettled = false;
                const timeoutMs = 15000; // Reduzido para 15s para falhar rápido

                // Forçar no-cache para evitar esquemas corrompidos por proxy
                const headers = {
                    ...(options?.headers || {}),
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };

                const timeoutId = setTimeout(() => {
                    if (isSettled) return;
                    isSettled = true;
                    reject(new Error(`A ligação ao Supabase excedeu o tempo (60s). Tentativa ${i + 1}/${MAX_RETRIES + 1}.`));
                }, timeoutMs);

                fetch(url, { ...options, headers })
                    .then(response => {
                        if (isSettled) return;
                        isSettled = true;
                        clearTimeout(timeoutId);
                        resolve(response);
                    })
                    .catch(err => {
                        if (isSettled) return;
                        isSettled = true;
                        clearTimeout(timeoutId);
                        reject(err);
                    });
            });
        } catch (err: any) {
            lastError = err;
            console.warn(`[Supabase Fetch] Falhou (Tentativa ${i + 1}/${MAX_RETRIES + 1}):`, err.message);
            if (i < MAX_RETRIES) {
                const waitTime = 1000 * Math.pow(2, i);
                await new Promise(r => setTimeout(r, waitTime));
            }
        }
    }
    console.error('[Supabase Fetch] Esgotadas todas as tentativas:', lastError);
    throw lastError;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'sb-amazing-erp-pro-auth-token',
        // Desactivar o lock do browser para evitar o erro de timeout quando a BD está lenta
        lock: (name: any, callback: any) => callback()
    },
    global: {
        fetch: customFetch
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
