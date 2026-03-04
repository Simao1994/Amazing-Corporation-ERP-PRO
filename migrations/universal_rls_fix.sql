-- ==========================================
-- 🛡️ FINAL UNIVERSAL SYSTEM RESTORE (V6)
-- ==========================================
-- Este script percorre TODAS as tabelas e resolve o erro de "Execute is NULL".
-- Ele desativa loops de segurança e garante acesso total ao Master Admin.

-- 1. Funções de Segurança Globais (SECURITY DEFINER para evitar loops)
CREATE OR REPLACE FUNCTION public.is_saas_admin() 
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saas_admin');
END; $$;

CREATE OR REPLACE FUNCTION public.get_auth_tenant() 
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END; $$;

-- 2. LOOP AUTOMÁTICO EM TODAS AS TABELAS
DO $$ 
DECLARE 
    tbl record;
    default_tenant_id uuid;
    drop_query text;
BEGIN
    -- Garantir Tenant Padrão (Amazing Corp)
    SELECT id INTO default_tenant_id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1;
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.saas_tenants (nome, slug, status) 
        VALUES ('Amazing Corporation', 'amazing-corp', 'ativo')
        RETURNING id INTO default_tenant_id;
    END IF;

    -- Iterar por todas as tabelas no schema 'public'
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys', '_prisma_migrations', 'schema_migrations')
    LOOP
        -- A. Adicionar coluna 'tenant_id' se faltar (Módulos de Negócio)
        IF tbl.table_name NOT IN ('saas_tenants', 'saas_plans', 'saas_subscriptions', 'profiles') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = tbl.table_name AND column_name = 'tenant_id'
            ) THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id)', tbl.table_name);
            END IF;

            -- Vincular dados existentes ao tenant padrão
            EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', tbl.table_name, default_tenant_id);
        END IF;

        -- B. RESET DE RLS (Evitar Travamentos)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
        
        -- COLETAR POLÍTICAS EXISTENTES (Garantir que não seja NULL)
        SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tablename), '; ')
        INTO drop_query
        FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.table_name;

        -- Executar DROP apenas se houver políticas
        IF drop_query IS NOT NULL THEN
            EXECUTE drop_query;
        END IF;

        -- C. APLICAR REGRAS PADRÃO
        
        -- 1. Regra Admin: Acesso total (Baseado na função Security Definer)
        EXECUTE format('CREATE POLICY "global_admin_all_%s" ON public.%I FOR ALL TO authenticated USING (is_saas_admin())', tbl.table_name, tbl.table_name);

        -- 2. Regra de Isolamento de Tenant (Usuários Comuns)
        IF tbl.table_name NOT IN ('saas_tenants', 'saas_plans', 'saas_subscriptions', 'profiles') THEN
            EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL TO authenticated USING (tenant_id = get_auth_tenant())', tbl.table_name, tbl.table_name);
        ELSIF tbl.table_name = 'profiles' THEN
            EXECUTE 'CREATE POLICY "profile_self_all" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid())';
            EXECUTE 'CREATE POLICY "profile_tenant_select" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant())';
        END IF;

    END LOOP;
END $$;

-- 3. VALIDAR PERFIL MASTER ADMIN
INSERT INTO public.profiles (id, email, role, nome, tenant_id)
SELECT id, email, 'saas_admin', 'Master Admin', (SELECT id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1)
FROM auth.users WHERE email = 'simaopambo94@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'saas_admin',
    tenant_id = (SELECT id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1);

NOTIFY pgrst, 'reload schema';
