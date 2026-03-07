-- ================================================================
-- 🏆 SOLUÇÃO FINAL: RPC COM SECURITY DEFINER
-- Este script cria uma função que bypassa o RLS completamente.
-- Executa este script no SQL Editor do Supabase.
-- ================================================================

-- Criar a função que fará o INSERT em nome do sistema (sem checkar RLS)
CREATE OR REPLACE FUNCTION public.master_create_tenant(
    p_nome text,
    p_slug text,
    p_nif text DEFAULT NULL,
    p_status text DEFAULT 'ativo'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- Corre como owner da função, não como utilizador (bypassa RLS)
SET search_path = public
AS $$
DECLARE
    v_new_id uuid;
    v_role text;
BEGIN
    -- Verificar se o utilizador é master admin
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    IF v_role != 'saas_admin' THEN
        RAISE EXCEPTION 'Acesso negado: apenas o Master Admin pode criar empresas.';
    END IF;

    -- Validar slug
    IF EXISTS (SELECT 1 FROM public.saas_tenants WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Slug "%" já está em uso. Escolha outro.', p_slug;
    END IF;

    -- Inserir sem restricoes de RLS (SECURITY DEFINER bypassa as políticas)
    INSERT INTO public.saas_tenants (nome, slug, nif, status)
    VALUES (p_nome, p_slug, NULLIF(p_nif, ''), p_status)
    RETURNING id INTO v_new_id;

    RETURN json_build_object(
        'success', true,
        'id', v_new_id,
        'message', 'Empresa ' || p_nome || ' registada com sucesso!'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

-- Garantir que utilizadores autenticados podem chamar esta função
GRANT EXECUTE ON FUNCTION public.master_create_tenant TO authenticated;

DO $$
BEGIN 
    RAISE NOTICE '✅ Função master_create_tenant criada com sucesso. O frontend irá usar RPC para criar empresas.';
END $$;
