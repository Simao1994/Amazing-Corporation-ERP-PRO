-- ================================================================
-- 🚀 FIX: CARREGAMENTO INFINITO & RECURSIVIDADE DE RLS
-- Execute este script no SQL Editor do Supabase.
-- Objetivo: Eliminar loops de segurança que impedem o carregamento de dados.
-- ================================================================

-- 1. Funções de Segurança Ultra-Robustas (Sem Recursividade)
-- Usamos SECURITY DEFINER e evitamos consultar tabelas com RLS se possível.

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  -- 1. Tentar obter do JWT (Muito rápido, sem consulta a tabelas)
  _tenant_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'tenant_id')::uuid;
  
  -- 2. Fallback para consulta direta na tabela (Apenas se não houver no JWT)
  -- Como é SECURITY DEFINER, ela ignora RLS da tabela profiles se o owner for bypassrls (postgres)
  IF _tenant_id IS NULL THEN
    SELECT tenant_id INTO _tenant_id FROM public.profiles WHERE id = auth.uid();
  END IF;
  
  RETURN _tenant_id;
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
  _email text;
BEGIN
  -- 1. Check by email (Master Admin - Absolute bypass)
  _email := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email');
  IF _email = 'simaopambo94@gmail.com' THEN
    RETURN true;
  END IF;

  -- 2. Check by role in JWT
  _role := (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'role');
  IF _role IN ('saas_admin', 'admin') THEN
    RETURN true;
  END IF;

  -- 3. Fallback to profiles table
  SELECT role INTO _role FROM public.profiles WHERE id = auth.uid();
  RETURN _role IN ('saas_admin', 'admin');
END;
$$ LANGUAGE plpgsql;

-- 2. Resetar Políticas da Tabela Profiles (Onde o loop geralmente ocorre)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saas_admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_own_tenant_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profile_self_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_tenant_select" ON public.profiles;
DROP POLICY IF EXISTS "global_admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_read" ON public.profiles;

-- Criar novas políticas simplificadas para Profiles
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (is_saas_admin());
CREATE POLICY "profiles_self_all" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_tenant_read" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Padronizar e Reparar Tabelas POS (Categorias, Produtos, Clientes, etc.)
DO $$ 
DECLARE 
    pos_tbl text;
    drop_query text;
BEGIN
    FOR pos_tbl IN SELECT unnest(ARRAY['pos_categorias', 'pos_categoria', 'pos_produtos', 'pos_clientes', 'pos_faturas', 'pos_caixa', 'pos_vendas', 'pos_estoque'])
    LOOP
        -- A. Garantir que a tabela existe antes de mexer
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = pos_tbl) THEN
            
            -- B. Renomear empresa_id para tenant_id se necessário
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = pos_tbl AND column_name = 'empresa_id') 
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = pos_tbl AND column_name = 'tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empresa_id TO tenant_id', pos_tbl);
            END IF;

            -- C. Garantir que tenant_id existe
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = pos_tbl AND column_name = 'tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id)', pos_tbl);
            END IF;

            -- D. RESET DE RLS E POLÍTICAS (Limpeza Dinâmica Total)
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', pos_tbl);
            
            -- Remover absolutamente TODAS as políticas existentes na tabela
            FOR drop_query IN 
                SELECT format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tablename)
                FROM pg_policies 
                WHERE schemaname = 'public' AND tablename = pos_tbl
            LOOP
                EXECUTE drop_query;
            END LOOP;

            -- E. CRIAR NOVAS POLÍTICAS LIMPAS
            -- 1. Master Admin Bypass (Via JWT - Ultra Rápido)
            EXECUTE format('CREATE POLICY "master_admin_bypass_%s" ON public.%I FOR ALL TO authenticated USING (auth.jwt() ->> ''email'' = ''simaopambo94@gmail.com'')', pos_tbl, pos_tbl);
            
            -- 2. SaaS Admin Access (Via função que já usa JWT)
            EXECUTE format('CREATE POLICY "admin_all_%s" ON public.%I FOR ALL TO authenticated USING (public.is_saas_admin())', pos_tbl, pos_tbl);
            
            -- 3. Tenant Isolation (Isolamento de Empresa - Via função que já usa JWT)
            EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant())', pos_tbl, pos_tbl);

            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', pos_tbl);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', pos_tbl);
        END IF;
    END LOOP;

    -- G. CASO ESPECIAL: Renomear pos_categoria (singular) para pos_categorias (plural) se necessário
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_categoria') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_categorias') THEN
        ALTER TABLE public.pos_categoria RENAME TO pos_categorias;
    END IF;

END $$;

-- 4. Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

SELECT '✅ Reparação completa! Tabelas POS padronizadas e segurança otimizada.' as resultado;
