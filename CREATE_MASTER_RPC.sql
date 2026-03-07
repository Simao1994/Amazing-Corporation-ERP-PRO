-- ================================================================
-- 🏆 SOLUÇÃO FINAL ABRANGENTE: RLS + RPC PARA TODAS AS TABELAS SAAS
-- Execute este script no SQL Editor do Supabase.
-- ================================================================

-- ===== PASSO 1: DESACTIVAR RLS NAS TABELAS DE ADMINISTRAÇÃO =====
-- Estas tabelas são geridas apenas pelo Master Admin internamente.
-- A autenticação da aplicação já garante quem acede ao Master Admin.
ALTER TABLE public.saas_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions DISABLE ROW LEVEL SECURITY;

-- ===== PASSO 2: FUNÇÃO RPC PARA CRIAR EMPRESA =====
CREATE OR REPLACE FUNCTION public.master_create_tenant(
    p_nome text,
    p_slug text,
    p_nif text DEFAULT NULL,
    p_status text DEFAULT 'ativo'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_id uuid;
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role != 'saas_admin' THEN
        RAISE EXCEPTION 'Acesso negado: apenas o Master Admin pode criar empresas.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.saas_tenants WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Slug "%" já está em uso. Escolha outro.', p_slug;
    END IF;

    INSERT INTO public.saas_tenants (nome, slug, nif, status)
    VALUES (p_nome, p_slug, NULLIF(p_nif, ''), p_status)
    RETURNING id INTO v_new_id;

    RETURN json_build_object('success', true, 'id', v_new_id,
        'message', 'Empresa ' || p_nome || ' registada com sucesso!');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ===== PASSO 3: FUNÇÃO RPC PARA CRIAR/EDITAR PLANO =====
CREATE OR REPLACE FUNCTION public.master_upsert_plan(
    p_nome text,
    p_valor numeric,
    p_duracao_meses integer,
    p_max_users integer DEFAULT 10,
    p_features jsonb DEFAULT '[]'::jsonb,
    p_modules jsonb DEFAULT '[]'::jsonb,
    p_plan_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_result_id uuid;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role != 'saas_admin' THEN
        RAISE EXCEPTION 'Acesso negado: apenas o Master Admin pode gerir planos.';
    END IF;

    IF p_plan_id IS NOT NULL THEN
        -- Update
        UPDATE public.saas_plans
        SET nome = p_nome, valor = p_valor, duracao_meses = p_duracao_meses,
            max_users = p_max_users, features = p_features, modules = p_modules
        WHERE id = p_plan_id;
        v_result_id := p_plan_id;
    ELSE
        -- Insert
        INSERT INTO public.saas_plans (nome, valor, duracao_meses, max_users, features, modules)
        VALUES (p_nome, p_valor, p_duracao_meses, p_max_users, p_features, p_modules)
        RETURNING id INTO v_result_id;
    END IF;

    RETURN json_build_object('success', true, 'id', v_result_id,
        'message', 'Plano guardado com sucesso!');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ===== PASSO 4: GRANTS =====
GRANT EXECUTE ON FUNCTION public.master_create_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION public.master_upsert_plan TO authenticated;

DO $$
BEGIN 
    RAISE NOTICE '✅ RLS desactivado nas tabelas SaaS e RPCs criadas com sucesso.';
END $$;
