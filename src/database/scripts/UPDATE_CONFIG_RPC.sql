-- ================================================================
-- 🔧 MASTER ADMIN RPC PARA CONFIGURAÇÕES SAAAS
-- Permite que o Master Admin atualize a tabela saas_config ignorando RLS
-- Execute no SQL Editor do Supabase
-- ================================================================

CREATE OR REPLACE FUNCTION public.master_update_config(
    p_banco text,
    p_iban text,
    p_beneficiario text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Upsert na linha de ID 1
    INSERT INTO public.saas_config (id, banco, iban, beneficiario, updated_at)
    VALUES (1, p_banco, p_iban, p_beneficiario, now())
    ON CONFLICT (id) DO UPDATE
    SET 
        banco = EXCLUDED.banco,
        iban = EXCLUDED.iban,
        beneficiario = EXCLUDED.beneficiario,
        updated_at = EXCLUDED.updated_at;
        
    RETURN json_build_object('success', true, 'message', 'Configurações globais atualizadas com sucesso.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Dar permissão ao Utilizador Autenticado para invocar a função
GRANT EXECUTE ON FUNCTION public.master_update_config TO authenticated;
