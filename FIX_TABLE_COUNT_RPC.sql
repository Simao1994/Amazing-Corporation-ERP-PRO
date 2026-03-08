-- ================================================================
-- 📊 FIX: CONTAGEM REAL DE TABELAS DO SISTEMA
-- Este script cria a função RPC necessária para o Dashboard de Definições.
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_table_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que qualquer utilizador autenticado conte as tabelas
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT count(*)::integer 
        FROM pg_tables 
        WHERE schemaname = 'public'
    );
END;
$$;

-- Garantir que a função pode ser chamada pela API
GRANT EXECUTE ON FUNCTION public.get_table_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_count() TO anon;

-- Notificação de sucesso
DO $$
BEGIN 
    RAISE NOTICE '✅ RPC get_table_count() criada/atualizada com sucesso.';
END $$;
