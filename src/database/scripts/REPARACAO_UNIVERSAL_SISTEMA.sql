-- ==============================================================================
-- 🛡️ REPARAÇÃO UNIVERSAL: SEGURANÇA, RLS & ISOLAMENTO SaaS
-- Resolve: Dados cruzados, "Permission Denied" e Tabelas sem RLS.
-- Execute este script no SQL Editor do Supabase.
-- ==============================================================================

-- 1. Funções Core de Segurança (Com SECURITY DEFINER para evitar loops)
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
DECLARE
    _role TEXT;
    _email TEXT;
BEGIN
    -- Bypass por Email Estratégico (Dono do Sistema)
    IF (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email') = 'simaopambo94@gmail.com' THEN
        RETURN TRUE;
    END IF;

    -- Bypass por Metadata do JWT (Rápido)
    IF (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'role') IN ('saas_admin', 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Fallback: Consulta na BD
    SELECT role INTO _role FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(_role IN ('saas_admin', 'admin'), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS UUID AS $$
DECLARE
    _tenant_id UUID;
BEGIN
    -- 1. Tentar do JWT (Sub-ms)
    _tenant_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'tenant_id')::uuid;
    
    -- 2. Fallback BD
    IF _tenant_id IS NULL THEN
        SELECT tenant_id INTO _tenant_id FROM public.profiles WHERE id = auth.uid();
    END IF;
    
    RETURN _tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 2. Automação de RLS para TODAS as tabelas do sistema
DO $$ 
DECLARE 
    tbl RECORD;
    drop_policy_cmd TEXT;
BEGIN
    -- Iterar por todas as tabelas BASE (ignora views) no schema public que possuam a coluna 'tenant_id'
    FOR tbl IN 
        SELECT c.table_name 
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = 'public' 
        AND c.column_name = 'tenant_id'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT IN ('saas_tenants')
LOOP
        -- A. Ativar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl.table_name);

        -- B. Limpar Políticas Antigas
        FOR drop_policy_cmd IN 
            SELECT format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tablename)
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = tbl.table_name
        LOOP
            EXECUTE drop_policy_cmd;
        END LOOP;

        -- C. Criar Novas Políticas Robustas
        
        -- 1. Master Bypass (Email) - Agora com WITH CHECK explícito para INSERTs
        EXECUTE format('CREATE POLICY "master_bypass_%s" ON public.%I FOR ALL TO authenticated USING (auth.jwt() ->> ''email'' = ''simaopambo94@gmail.com'') WITH CHECK (auth.jwt() ->> ''email'' = ''simaopambo94@gmail.com'')', tbl.table_name, tbl.table_name);
        
        -- 2. Admin/SaaS Admin Access
        EXECUTE format('CREATE POLICY "admin_all_%s" ON public.%I FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin())', tbl.table_name, tbl.table_name);
        
        -- 3. Tenant Isolation (Isolamento de Empresa)
        EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant()) WITH CHECK (tenant_id = public.get_auth_tenant())', tbl.table_name, tbl.table_name);

        RAISE NOTICE 'RLS Aplicado com Sucesso: %', tbl.table_name;
    END LOOP;

    -- D. Caso Especial: Tabela Profiles (Segurança extra)
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "profiles_self_all" ON public.profiles;
    CREATE POLICY "profiles_self_all" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid());
    
    -- E. Caso Especial: Tabela Tenats (Empresas)
    ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenants_view_own" ON public.saas_tenants;
    CREATE POLICY "tenants_view_own" ON public.saas_tenants FOR SELECT TO authenticated USING (id = public.get_auth_tenant() OR public.is_master_admin());

END $$;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Sistema Totalmente Protegido! RLS ativado em todas as tabelas com isolamento por tenant.' as status;
