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
        // Isso impede bloqueios cruéis de Antivírus no Windows Desktop
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Ambiente local detectado. Usando proxy /sbapi para prevenir bloqueios de rede.');
            return '/sbapi';
        }
    }
    return supabaseUrl || '';
};

const finalUrl = getBaseURL();

if (!finalUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis de ambiente do Supabase não encontradas!');
}

export const supabase = createClient(finalUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'sb-amazing-erp-pro-auth-token'
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
