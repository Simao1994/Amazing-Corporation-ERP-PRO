-- ================================================================
-- 🚀 REPARAÇÃO DE ESTABILIDADE FINAL: RLS RECURSION FIX (V6)
-- Resolve o "Carregamento Infinito" e "Desconexão do Banco"
-- ================================================================

-- 1. FUNÇÕES DE INFRAESTRUTURA (ULTRA-RÁPIDAS E SEM RECURSIVIDADE)
-- Usamos JWT Claims para evitar consultar a tabela Profiles, eliminando o loop infinito.

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Tenta obter do JWT (Injetado pelo Supabase Auth em cada pedido)
  -- Isto é instantâneo e não toca em tabelas com RLS.
  RETURN (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'tenant_id')::uuid;
EXCEPTION WHEN OTHERS THEN
  -- Fallback de segurança (Sem RLS devido ao SECURITY DEFINER)
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  _role text;
BEGIN
  -- 1. Shortcut para Email Mestre
  IF (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email') = 'simaopambo94@gmail.com' THEN
    RETURN true;
  END IF;

  -- 2. Check Role no JWT metadata
  _role := (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'role');
  IF _role IN ('saas_admin', 'admin') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 2. RESET TOTAL DE POLÍTICAS CONFLITUOSAS NA TABELA PROFILES
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Criar Novas Políticas Limpas
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.is_saas_admin());
CREATE POLICY "profiles_self_all" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_tenant_select" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.get_auth_tenant());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. SINCRONIZAÇÃO DE METADADOS (CRÍTICO)
-- Garante que o role e tenantID estão no auth.users para que as funções acima não falhem.
DO $$
DECLARE
  p_rec RECORD;
BEGIN
  FOR p_rec IN SELECT id, role, tenant_id FROM public.profiles 
  LOOP
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', p_rec.role, 'tenant_id', p_rec.tenant_id)
    WHERE id = p_rec.id;
  END LOOP;
END $$;

-- 4. LIMPEZA DE TODAS AS TABELAS DE NEGÓCIO (ISOLAMENTO SEGURO)
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
        AND table_name NOT IN ('profiles', 'saas_tenants', 'saas_subscriptions', 'saas_plans')
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.table_name);
        
        -- Remover políticas de isolamento antigas
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', tbl.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation policy" ON public.%I', tbl.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "admin_all_%s" ON public.%I', tbl.table_name, tbl.table_name);
        
        -- Criar novas políticas rápidas
        EXECUTE format('CREATE POLICY "admin_all_%s" ON public.%I FOR ALL TO authenticated USING (public.is_saas_admin())', tbl.table_name, tbl.table_name);
        EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant())', tbl.table_name, tbl.table_name);
        
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Sistema estabilizado! Loops de RLS eliminados e sincronização de metadados concluída.' as resultado;
