-- ================================================================
-- 📊 RASTREAMENTO DE VISITAS E VISUALIZAÇÕES
-- Execute este script no SQL Editor do Supabase.
-- ================================================================

-- 1. Assegurar que as colunas de estatísticas existem na tabela saas_config
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='saas_config' AND column_name='visitors_count'
    ) THEN
        ALTER TABLE public.saas_config ADD COLUMN visitors_count integer DEFAULT 0;
        ALTER TABLE public.saas_config ADD COLUMN views_count integer DEFAULT 0;
        RAISE NOTICE '✅ Colunas de rastreamento adicionadas a saas_config.';
    ELSE
        RAISE NOTICE '✅ Colunas de rastreamento já existem.';
    END IF;
END $$;

-- 2. Função RPC super rápida para incrementar contadores atomicamente
CREATE OR REPLACE FUNCTION public.increment_site_stats(is_new_visitor boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Incrementar as visualizações sempre, e os visitantes se for a primeira vez
    UPDATE public.saas_config
    SET 
        views_count = COALESCE(views_count, 0) + 1,
        visitors_count = COALESCE(visitors_count, 0) + (CASE WHEN is_new_visitor THEN 1 ELSE 0 END),
        updated_at = now()
    WHERE id = 1;
END;
$$;

-- 3. Dar permissão ao anónimo para chamar este RPC (pois acontece na homepage)
GRANT EXECUTE ON FUNCTION public.increment_site_stats TO anon, authenticated;

DO $$
BEGIN 
    RAISE NOTICE '✅ Sistema de rastreamento de Site instalado com sucesso!';
END $$;
