-- ==========================================
-- 🛡️ FINAL UNIVERSAL SYSTEM RESTORE (V5)
-- ==========================================
-- Este script percorre TODAS as tabelas do banco de dados e aplica
-- uma camada de segurança padrão, não recursiva e ultra-performante.

-- 1. Funções de Segurança (SECURITY DEFINER para ignorar RLS e evitar loops)
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

-- 2. LOOP GLOBAL EM TODAS AS TABELAS
DO $$ 
DECLARE 
    tbl record;
    default_tenant_id uuid;
BEGIN
    -- Obter ou Criar Tenant Padrão (Amazing Corp)
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
        -- Ignorar tabelas internas do Supabase ou migrações se necessário
        AND table_name NOT IN ('spatial_ref_sys', '_prisma_migrations', 'schema_migrations')
    LOOP
        -- A. Garantir coluna 'tenant_id' para tabelas de negócio
        IF tbl.table_name NOT IN ('saas_tenants', 'saas_plans', 'saas_subscriptions', 'profiles') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = tbl.table_name AND column_name = 'tenant_id'
            ) THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id)', tbl.table_name);
            END IF;

            -- Preencher registros órfãos
            EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', tbl.table_name, default_tenant_id);
        END IF;

        -- B. RESET TOTAL DE RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
        
        -- Remover TODAS as políticas existentes para esta tabela
        EXECUTE (
            SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tablename), '; ')
            FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.table_name
        );

        -- C. APLICAR POLÍTICAS PADRÃO (Sem Recursão)
        
        -- 1. Admin do Sistema: Pode TUDO em QUALQUER tabela
        EXECUTE format('CREATE POLICY "global_admin_all_%s" ON public.%I FOR ALL TO authenticated USING (is_saas_admin())', tbl.table_name, tbl.table_name);

        -- 2. Isolamento de Tenant (Para usuários comuns)
        IF tbl.table_name NOT IN ('saas_tenants', 'saas_plans', 'saas_subscriptions', 'profiles') THEN
            EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL TO authenticated USING (tenant_id = get_auth_tenant())', tbl.table_name, tbl.table_name);
        ELSIF tbl.table_name = 'profiles' THEN
            -- Usuários vêem a si mesmos e outros do seu tenant (select apenas)
            EXECUTE 'CREATE POLICY "profile_self_all" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid())';
            EXECUTE 'CREATE POLICY "profile_tenant_select" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant())';
        END IF;

    END LOOP;
END $$;

-- 3. Garantir que o perfil do Master Admin está correto
INSERT INTO public.profiles (id, email, role, nome, tenant_id)
SELECT id, email, 'saas_admin', 'Master Admin', (SELECT id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1)
FROM auth.users WHERE email = 'simaopambo94@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'saas_admin',
    tenant_id = (SELECT id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1);

NOTIFY pgrst, 'reload schema';
