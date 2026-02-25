import { supabase } from '../src/lib/supabase';
import { AmazingStorage } from './storage';
import { FileDocument, FileCategory } from '../types';

// Tracer Version: 1.0.3 - Auth Restriction Removed

export const FILE_LIMIT_MB = 50;
export const ALLOWED_FORMATS = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'zip', 'rar', 'txt'
];

export const FilesService = {
    async getDocuments(filters?: { search?: string; category?: string; type?: string }) {
        let query = supabase
            .from('documentos')
            .select('*, categoria:categorias_documentos(nome), responsavel:profiles(nome)')
            .order('criado_em', { ascending: false });

        if (filters?.search) {
            query = query.or(`titulo.ilike.%${filters.search}%,nome_arquivo.ilike.%${filters.search}%,tags.ilike.%${filters.search}%`);
        }

        if (filters?.category && filters.category !== 'all') {
            query = query.eq('categoria_id', filters.category);
        }

        if (filters?.type && filters.type !== 'all') {
            query = query.eq('tipo_arquivo', filters.type);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as FileDocument[];
    },

    async getCategories() {
        const { data, error } = await supabase
            .from('categorias_documentos')
            .select('*')
            .order('nome');
        if (error) throw error;
        return data as FileCategory[];
    },

    async uploadFile(file: File, metadata: Partial<FileDocument>, userId?: string) {
        // 1. Validations
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_FORMATS.includes(extension)) {
            throw new Error(`[FS-UPL-01] Formato .${extension} não permitido. Use: ${ALLOWED_FORMATS.join(', ')}`);
        }

        if (file.size > FILE_LIMIT_MB * 1024 * 1024) {
            throw new Error(`[FS-UPL-02] O arquivo excede o limite de ${FILE_LIMIT_MB}MB.`);
        }

        // 2. Auth Check - Passive Check
        let finalUserId = userId;
        if (!finalUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            finalUserId = user?.id; // Allow null to proceed to DB which will handle RLS
        }

        const filePath = `${finalUserId || 'anonymous'}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('archive-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 3. Save to Database
        const docData = {
            titulo: metadata.titulo || file.name,
            descricao: metadata.descricao,
            nome_arquivo: file.name,
            tipo_arquivo: extension,
            tamanho_arquivo: file.size,
            categoria_id: metadata.categoria_id,
            responsavel_id: finalUserId,
            tags: metadata.tags,
            caminho: filePath,
        };

        const { data, error: dbError } = await supabase
            .from('documentos')
            .insert([docData])
            .select()
            .single();

        if (dbError) {
            // Rollback storage if DB fails
            await supabase.storage.from('archive-files').remove([filePath]);
            throw dbError;
        }

        AmazingStorage.logAction('Documentos', 'Upload', `Arquivo enviado: ${file.name}`);
        return data;
    },

    async deleteDocument(id: string, caminho: string, nome: string) {
        // 1. Delete from DB
        const { error: dbError } = await supabase
            .from('documentos')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        // 2. Delete from Storage
        const { error: storageError } = await supabase.storage
            .from('archive-files')
            .remove([caminho]);

        if (storageError) console.warn('Erro ao remover do storage:', storageError);

        AmazingStorage.logAction('Documentos', 'Exclusão', `Arquivo excluído: ${nome}`);
    },

    async createCategory(nome: string, userId?: string) {
        console.log(`[FS-CAT-01] createCategory: nome="${nome}", userId="${userId}"`);

        // 1. Auth Check - Passive
        let finalUserId = userId;
        if (!finalUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            finalUserId = user?.id;
        }

        // 2. Insert - Let PostgreSQL handle RLS/Security

        // 2. Insert
        const { data, error } = await supabase
            .from('categorias_documentos')
            .insert([{
                nome: nome.trim(),
                responsavel_id: finalUserId
            }]);

        if (error) {
            console.error('[FS-CAT-03] Database error:', error);
            if (error.code === '23505') throw new Error('[FS-CAT-04] Esta categoria já existe.');
            if (error.code === '42501') throw new Error('[FS-CAT-05] Sem permissão de acesso ao banco (RLS).');
            throw new Error(`[FS-CAT-06] Erro no banco (${error.code}): ${error.message}`);
        }

        // 3. Log (Safe)
        try {
            AmazingStorage.logAction('Documentos', 'Configuração', `Categoria criada: ${nome}`);
        } catch (logErr) {
            console.warn('Logging failed but category was created:', logErr);
        }

        return data;
    },

    async deleteCategory(id: string, nome: string) {
        const { error } = await supabase
            .from('categorias_documentos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        AmazingStorage.logAction('Documentos', 'Configuração', `Categoria excluída: ${nome}`);
    },

    getFileUrl(caminho: string) {
        return supabase.storage.from('archive-files').getPublicUrl(caminho).data.publicUrl;
    }
};
