
import { createClient } from '@supabase/supabase-js'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Revertido o bypass de proxy por causa do bug de KEEP-ALIVE do Node.js (ECONNRESET)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não encontradas! Verifique o ficheiro .env.local');
}

/**
 * Custom fetch wrapper to enforce a STRICT 10-second timeout on all Supabase requests.
 * Usamos a Promise manual porque alguns antivírus agressivos interceptam a função window.fetch
 * e ignoram o sinal AbortController interno, fazendo com que as Promises congelem infinitamente.
 */
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
        let isSettled = false;

        const id = setTimeout(() => {
            if (isSettled) return;
            isSettled = true;
            reject(new Error('A ligação excedeu o tempo limite (10s). O seu Antivírus, Firewall ou AdBlocker pode estar a bloquear o acesso à base de dados.'));
        }, 8000); // 8s strict timeout (alinhado com fail-safes do Auth/SaaS)

        fetch(url, options)
            .then(response => {
                if (isSettled) return;
                isSettled = true;
                clearTimeout(id);
                resolve(response);
            })
            .catch(err => {
                if (isSettled) return;
                isSettled = true;
                clearTimeout(id);
                reject(err);
            });
    });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
    global: {
        fetch: customFetch
    }
})

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
