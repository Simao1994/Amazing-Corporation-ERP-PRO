-- ==========================================
-- 🛡️ UNIVERSAL RLS RECURSION FIX (V4 - ROBUST)
-- ==========================================

-- 1. Helper Functions (SECURITY DEFINER to break recursion)
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

-- 2. DYNAMIC COLUMN SETUP & RLS CLEANUP
DO $$ 
DECLARE 
    t text;
    default_tenant_id uuid;
    tables text[] := ARRAY[
        'profiles', 'saas_tenants', 'saas_subscriptions', 'saas_plans',
        'fin_transacoes', 'acc_empresas', 'acc_extratos_bancarios',
        'funcionarios', 'hr_recibos', 'hr_presencas', 'hr_metas',
        'acc_lancamentos', 'acc_contas', 'acc_periodos', 'rh_contas_bancarias',
        'acc_centros_custo', 'contabil_faturas', 'inventario', 'stock_movimentos'
    ];
BEGIN
    -- Get or Create Default Tenant
    SELECT id INTO default_tenant_id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1;
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.saas_tenants (nome, slug, status) 
        VALUES ('Amazing Corporation', 'amazing-corp', 'ativo')
        RETURNING id INTO default_tenant_id;
    END IF;

    FOREACH t IN ARRAY tables LOOP
        -- Check if table exists before proceeding
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            
            -- Add tenant_id if missing (except for tenants/plans themselves)
            IF t NOT IN ('saas_tenants', 'saas_plans') AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
            ) THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id)', t);
            END IF;

            -- Populate tenant_id for existing data
            IF t NOT IN ('saas_tenants', 'saas_plans') THEN
                EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, default_tenant_id);
            END IF;

            -- Cleanup RLS
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            
            EXECUTE (
                SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tablename), '; ')
                FROM pg_policies WHERE schemaname = 'public' AND tablename = t
            );

            -- Global Admin Policy
            EXECUTE format('CREATE POLICY "admin_all_%s" ON public.%I FOR ALL TO authenticated USING (is_saas_admin())', t, t);
            
            -- Tenant Isolation Policy (Regular Users)
            IF t NOT IN ('saas_tenants', 'saas_plans', 'profiles') THEN
                EXECUTE format('CREATE POLICY "tenant_iso_%s" ON public.%I FOR ALL TO authenticated USING (tenant_id = get_auth_tenant())', t, t);
            ELSIF t = 'profiles' THEN
                EXECUTE format('CREATE POLICY "profiles_self" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid())');
                EXECUTE format('CREATE POLICY "profiles_tenant" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant())');
            END IF;
        END IF;
    END LOOP;
END $$;

-- 3. Ensure Master Admin is correctly set up
INSERT INTO public.profiles (id, email, role, nome, tenant_id)
SELECT id, email, 'saas_admin', 'Master Admin', (SELECT id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1)
FROM auth.users WHERE email = 'simaopambo94@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'saas_admin',
    tenant_id = (SELECT id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1);

NOTIFY pgrst, 'reload schema';
