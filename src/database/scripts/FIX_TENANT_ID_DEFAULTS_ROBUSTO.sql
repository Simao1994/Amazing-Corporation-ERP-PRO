-- ================================================================
-- 🛡️ REPARAÇÃO DEFINITIVA: GET_AUTH_TENANT (Versão Segura)
-- Esta versão resolve problemas de search_path e recursividade.
-- ================================================================

-- 1. Eliminar versões anteriores para evitar conflitos de assinatura
DROP FUNCTION IF EXISTS public.get_auth_tenant() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_tenant_id() CASCADE;

-- 2. Criar a função com as melhores práticas de segurança (SECURITY DEFINER + search_path)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
BEGIN
    -- Query directa com search_path garantido
    SELECT tenant_id INTO v_tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    RETURN v_tenant_id;
END;
$$;

-- 3. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO service_role;

-- 4. Re-aplicar os DEFAULTS nas tabelas (caso tenham sido removidos ou alterados)
-- Este bloco é idempotente.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
        AND table_name NOT IN ('saas_tenants', 'saas_plans', 'saas_subscriptions', 'profiles')
    LOOP
        -- Remove default anterior se existir para evitar duplicação ou erro
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id DROP DEFAULT', r.table_name);
        -- Aplica o novo default
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', r.table_name);
        RAISE NOTICE 'Reparado DEFAULT tenant_id na tabela: %', r.table_name;
    END LOOP;
END $$;

-- 5. Recarregar Schema para o PostgREST
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO: Função get_auth_tenant reparada com SECURITY DEFINER e search_path.';
END $$;
