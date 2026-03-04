-- ==========================================
-- 🛡️ FINAL SAAS RLS RESET & OVERHAUL
-- ==========================================

-- 1. Redefine Security Check Helpers (SECURITY DEFINER is key to avoiding recursion)
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'saas_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_tenant_id;
END;
$$;

-- 2. RESET POLICIES (Start fresh)
ALTER TABLE public.saas_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. APPLY NEW CLEAN POLICIES
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- --- SAAS_TENANTS ---
DROP POLICY IF EXISTS "saas_tenants_admin_all" ON public.saas_tenants;
CREATE POLICY "saas_tenants_admin_all" ON public.saas_tenants FOR ALL TO authenticated USING (is_saas_admin());

DROP POLICY IF EXISTS "saas_tenants_user_select" ON public.saas_tenants;
CREATE POLICY "saas_tenants_user_select" ON public.saas_tenants FOR SELECT TO authenticated USING (id = get_auth_tenant());

-- --- SAAS_SUBSCRIPTIONS ---
DROP POLICY IF EXISTS "saas_subs_admin_all" ON public.saas_subscriptions;
CREATE POLICY "saas_subs_admin_all" ON public.saas_subscriptions FOR ALL TO authenticated USING (is_saas_admin());

DROP POLICY IF EXISTS "saas_subs_user_select" ON public.saas_subscriptions;
CREATE POLICY "saas_subs_user_select" ON public.saas_subscriptions FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant());

-- --- SAAS_PLANS ---
DROP POLICY IF EXISTS "saas_plans_public_select" ON public.saas_plans;
CREATE POLICY "saas_plans_public_select" ON public.saas_plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "saas_plans_admin_all" ON public.saas_plans;
CREATE POLICY "saas_plans_admin_all" ON public.saas_plans FOR ALL TO authenticated USING (is_saas_admin());

-- --- PROFILES ---
DROP POLICY IF EXISTS "profiles_self_all" ON public.profiles;
CREATE POLICY "profiles_self_all" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (is_saas_admin());

DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;
CREATE POLICY "profiles_tenant_select" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = get_auth_tenant());

-- 4. Ensure Master Admin Account Exists with Correct Role and Tenant
DO $$
DECLARE
    default_tenant_id uuid;
BEGIN
    -- Encontrar o ID do tenant padrão (Amazing Corporation)
    SELECT id INTO default_tenant_id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1;

    -- Se não existir, criar um temporário para não quebrar a restrição NOT NULL
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.saas_tenants (nome, slug, status) 
        VALUES ('Amazing Corporation', 'amazing-corp', 'ativo')
        ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome
        RETURNING id INTO default_tenant_id;
    END IF;

    -- Upsert do perfil com o tenant_id obrigatório
    INSERT INTO public.profiles (id, email, role, nome, tenant_id)
    SELECT id, email, 'saas_admin', 'Simao Pambo', default_tenant_id
    FROM auth.users
    WHERE email = 'simaopambo94@gmail.com'
    ON CONFLICT (id) DO UPDATE SET 
        role = 'saas_admin',
        tenant_id = default_tenant_id;
END $$;

-- 5. Finalize
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
NOTIFY pgrst, 'reload schema';
