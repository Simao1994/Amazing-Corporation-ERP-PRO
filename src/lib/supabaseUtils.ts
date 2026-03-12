import { supabase } from './supabaseClient';

/**
 * Opções para a consulta segura
 */
interface SafeQueryOptions<T> {
    retries?: number;
    delay?: number;
    cacheKey?: string;
    cacheTTL?: number; // em ms
    fallbackData?: T | null;
}

/**
 * Cache simples em memória
 */
const queryCache = new Map<string, { data: any; expiry: number }>();

/**
 * Controle de concorrência: rastreia consultas em andamento
 */
const pendingQueries = new Map<string, Promise<any>>();

/**
 * Sistema de Retentativa e Re-conexão (Helper)
 */
export async function safeQuery<T>(
    queryFn: () => PromiseLike<{ data: T | null; error: any }>,
    options: SafeQueryOptions<T> = {}
): Promise<{ data: T | null; error: any }> {
    const {
        retries = 3,
        delay = 1000,
        cacheKey,
        cacheTTL = 30000, // 30 segundos por padrão
        fallbackData = null
    } = options;

    // 1. Verificar Cache (apenas se tiver cacheKey e for uma leitura)
    if (cacheKey) {
        const cached = queryCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[Cache Hit] ${cacheKey}`);
            return { data: cached.data as T, error: null };
        }
    }

    // 2. Controle de Concorrência (Deduplicação de chamadas simultâneas)
    const concurrencyKey = cacheKey || queryFn.toString().substring(0, 100);
    if (pendingQueries.has(concurrencyKey)) {
        console.log(`[Concurrency] Aguardando consulta duplicada: ${concurrencyKey}`);
        return pendingQueries.get(concurrencyKey);
    }

    const executeQuery = async (): Promise<{ data: T | null; error: any }> => {
        let currentDelay = delay;
        let lastError: any;

        for (let i = 0; i < retries; i++) {
            try {
                // @ts-ignore
                const { data, error } = await queryFn();

                if (!error) {
                    // Gravar no cache se necessário
                    if (cacheKey) {
                        queryCache.set(cacheKey, {
                            data,
                            expiry: Date.now() + cacheTTL
                        });
                    }
                    return { data, error: null };
                }

                lastError = error;

                // Erros de rede ou timeout (PGRST301 = JWT, 504 = Gateway, 502 = Bad Gateway)
                const errorMsg = error?.message?.toLowerCase() || '';
                const isNetworkError = errorMsg.includes('fetch') ||
                    errorMsg.includes('network') ||
                    errorMsg.includes('failed to fetch') ||
                    error?.code === 'PGRST301' ||
                    error?.status === 504 ||
                    error?.status === 502;

                if (!isNetworkError) break; // Erros lógicos (403 RLS, 404, 400) não devem ter retry

                console.warn(`[Supabase SafeQuery] Tentativa ${i + 1}/${retries} falhou: ${error.message}.`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay *= 2; // Exponential backoff
            } catch (err: any) {
                lastError = err;
                const errLower = err?.message?.toLowerCase() || '';
                if (errLower.includes('fetch') || errLower.includes('network')) {
                    await new Promise(resolve => setTimeout(resolve, currentDelay));
                    currentDelay *= 2;
                    continue;
                }
                break;
            }
        }

        // Se falhou após todas as tentativas, usar fallback se houver
        if (fallbackData !== null) {
            console.warn(`[Supabase Fallback] Usando dados de contingência para falha crítica.`);
            return { data: fallbackData, error: null };
        }

        return { data: null, error: lastError };
    };

    const queryPromise = executeQuery();
    pendingQueries.set(concurrencyKey, queryPromise);

    try {
        return await queryPromise;
    } finally {
        pendingQueries.delete(concurrencyKey);
    }
}

/**
 * Limpar o cache manualmente se necessário
 */
export const clearQueryCache = (key?: string) => {
    if (key) {
        queryCache.delete(key);
    } else {
        queryCache.clear();
    }
};

/**
 * Helper para obter perfil de utilizador com cache
 */
export async function getUserProfile(userId: string) {
    return safeQuery(() =>
        supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single(),
        { cacheKey: `profile-${userId}`, cacheTTL: 60000 }
    );
}

/**
 * Upload de media para o blog
 */
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

/**
 * Upload múltiplo de media
 */
export async function uploadMultipleBlogMedia(files: FileList | File[]) {
    const uploadPromises = Array.from(files).map(file => uploadBlogMedia(file));
    return Promise.all(uploadPromises);
}

