/**
 * LEGACY EXPORT - Redirecciona para a nova estrutura singleton
 * TODO: Actualizar importações para usar supabaseClient e supabaseUtils directamente
 */
export { supabase } from './supabaseClient';
export {
    safeQuery,
    getUserProfile,
    uploadBlogMedia,
    uploadMultipleBlogMedia,
    clearQueryCache
} from './supabaseUtils';
