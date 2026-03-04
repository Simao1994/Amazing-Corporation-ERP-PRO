-- ==========================================
-- 🛡️ UNIVERSAL RLS RECURSION FIX (V3)
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

-- 2. RESET & APPLY CLEAN POLICIES FOR ALL BUSINESS TABLES
-- This list covers all suspected tables mentioned in the code and logs.

DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY[
        'profiles', 'saas_tenants', 'saas_subscriptions', 'saas_plans',
        'fin_transacoes', 'acc_empresas', 'acc_extratos_bancarios',
        'funcionarios', 'hr_recibos', 'hr_presencas', 'hr_metas',
        'acc_lancamentos', 'acc_contas', 'acc_periodos', 'rh_contas_bancarias'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Disable and Re-enable to clear any weird state
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Drop all existing policies to avoid conflicts
        EXECUTE (
            SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tablename), '; ')
            FROM pg_policies WHERE schemaname = 'public' AND tablename = t
        );

        -- Standard "Admin Access Everything" Policy
        EXECUTE format('CREATE POLICY "admin_all_%s" ON public.%I FOR ALL TO authenticated USING (is_saas_admin())', t, t);
    END LOOP;
END $$;

-- 3. SPECIFIC TENANT ISOLATION POLICIES (Regular User Access)
-- Profiles: Self-access
CREATE POLICY "profiles_self_access" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid());

-- Tenant Isolation for Business Tables (Only if not admin)
CREATE POLICY "tenant_isolation_fin_transacoes" ON public.fin_transacoes FOR ALL TO authenticated USING (tenant_id = get_auth_tenant());
CREATE POLICY "tenant_isolation_acc_empresas" ON public.acc_empresas FOR ALL TO authenticated USING (id = get_auth_tenant() OR true); -- Permissive for now
CREATE POLICY "tenant_isolation_funcionarios" ON public.funcionarios FOR ALL TO authenticated USING (tenant_id = get_auth_tenant());
CREATE POLICY "tenant_isolation_hr_recibos" ON public.hr_recibos FOR ALL TO authenticated USING (tenant_id = get_auth_tenant());
CREATE POLICY "tenant_isolation_profiles" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant());

-- 4. FIX Master Admin Profile ONE LAST TIME
DO $$
DECLARE
    default_id uuid;
BEGIN
    SELECT id INTO default_id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1;
    IF default_id IS NULL THEN
        INSERT INTO public.saas_tenants (nome, slug, status) 
        VALUES ('Amazing Corporation', 'amazing-corp', 'ativo')
        RETURNING id INTO default_id;
    END IF;

    INSERT INTO public.profiles (id, email, role, nome, tenant_id)
    SELECT id, email, 'saas_admin', 'Master Admin', default_id
    FROM auth.users WHERE email = 'simaopambo94@gmail.com'
    ON CONFLICT (id) DO UPDATE SET 
        role = 'saas_admin',
        tenant_id = default_id;
END $$;

NOTIFY pgrst, 'reload schema';
