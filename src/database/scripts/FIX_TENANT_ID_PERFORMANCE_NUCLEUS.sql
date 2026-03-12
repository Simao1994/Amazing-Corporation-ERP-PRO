-- ================================================================
-- 🚀 NUCLEUS FIX: JWT-BASED MULTI-TENANCY (ULTRA PERFORMANCE)
-- Esta é a solução definitiva para acabar com recursividade de RLS
-- e tabelas que desaparecem por falha de ligação ao perfil.
-- ================================================================

-- 1. Função para Sincronizar Tenant ID para o Metadados do Auth
-- Isto permite que as políticas de segurança (RLS) usem o JWT directamente.
CREATE OR REPLACE FUNCTION public.sync_tenant_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    -- Actualiza o auth.users via metadata do Supabase
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('tenant_id', NEW.tenant_id)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger para manter a sincronização activa
DROP TRIGGER IF EXISTS trigger_sync_tenant ON public.profiles;
CREATE TRIGGER trigger_sync_tenant
AFTER INSERT OR UPDATE OF tenant_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_to_auth_metadata();

-- 3. Função get_auth_tenant ULTRA-RÁPIDA (Lê do JWT, sem query à tabela)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Tenta obter do JWT claims (muito mais rápido, sem recursão)
  -- Se não estiver no JWT ainda (ex: primeiro login), faz o fallback para a tabela
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
END;
$$;

-- 4. Reparação Global de DEFAULTS
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
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', r.table_name);
    END LOOP;
END $$;

-- 5. Sincronização Inicial: Forçar todos os perfis existentes para o auth.users metadata
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN SELECT id, tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LOOP
        UPDATE auth.users 
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('tenant_id', p.tenant_id)
        WHERE id = p.id;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ NUCLEUS FIX APLICADO: RLS agora usa metadados JWT para performance instantânea.';
END $$;
