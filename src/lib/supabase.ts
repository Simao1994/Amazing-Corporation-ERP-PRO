
import { createClient } from '@supabase/supabase-js'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Revertido o bypass de proxy por causa do bug de KEEP-ALIVE do Node.js (ECONNRESET)
// Usamos o prefixo /sbapi para que o Vite/Vercel faça proxy da ligação,
// evitando bloqueios directos de Antivírus ao domínio .supabase.co
const supabaseUrl = window.location.origin + '/sbapi';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não encontradas! Verifique o ficheiro .env.local');
}

const MAX_RETRIES = 2;

const customFetch: typeof fetch = async (url, options) => {
    let lastError: any;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            return await new Promise<Response>((resolve, reject) => {
                let isSettled = false;
                const timeoutMs = 20000; // 20s timeout

                const timeoutId = setTimeout(() => {
                    if (isSettled) return;
                    isSettled = true;
                    reject(new Error(`A ligação excedeu o tempo (20s). Tentativa ${i + 1}/${MAX_RETRIES + 1}.`));
                }, timeoutMs);

                fetch(url, options)
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
            console.warn(`Supabase Fetch Falhou (Tentativa ${i + 1}):`, err.message);
            if (i < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
            }
        }
    }
    throw lastError;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
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
