
-- 1. Ensure helper functions are robust
CREATE OR REPLACE FUNCTION public.get_auth_tenant_safe() RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_role_safe() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Clean up previous policies
DO $$ 
DECLARE 
    t_name text;
    p_name text;
BEGIN 
    FOR t_name, p_name IN 
        SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' 
    LOOP
        IF p_name LIKE 'rls_universal_policy%' OR p_name LIKE 'profiles_access%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_name, t_name);
        END IF;
    END LOOP;
END $$;

-- 3. SPECIFIC RIGID POLICY FOR PROFILES (To avoid recursion)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_access_v8" ON public.profiles;
CREATE POLICY "profiles_access_v8" ON public.profiles
FOR ALL
USING (
    id = auth.uid() 
    OR 
    public.get_auth_role_safe() = 'saas_admin'
);

-- 4. SMART UNIVERSAL POLICY (CHECKS FOR COLUMN EXISTENCE)
DO $$ 
DECLARE 
    t_name text;
    has_tenant_col boolean;
BEGIN 
    FOR t_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        -- Structural tables with custom logic or no tenant isolation needed
        AND tablename NOT IN ('profiles', 'saas_tenants', 'saas_subscriptions', 'saas_plans', 'audit_logs', 'app_roles', 'config_sistema', 'app_modules')
    LOOP
        -- Check if tenant_id column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t_name AND column_name = 'tenant_id'
        ) INTO has_tenant_col;

        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "rls_universal_policy_v8" ON %I', t_name);
            
            IF has_tenant_col THEN
                EXECUTE format('CREATE POLICY "rls_universal_policy_v8" ON %I USING (
                    public.get_auth_role_safe() = ''saas_admin''
                    OR 
                    (tenant_id = public.get_auth_tenant_safe())
                )', t_name);
                RAISE NOTICE 'Applied tenant policy to %', t_name;
            ELSE
                -- If no tenant_id, ALLOW ALL for saas_admin, restrict others? 
                -- To be safe, let's allow saas_admin and let other roles be restricted by lack of generic policy
                EXECUTE format('CREATE POLICY "rls_universal_policy_v8" ON %I USING (
                    public.get_auth_role_safe() = ''saas_admin''
                )', t_name);
                RAISE NOTICE 'Applied admin-only policy to % (missing tenant_id)', t_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping table %: %', t_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 5. Special rules for system tables
-- app_roles and config_sistema: everyone can read (to see menus/settings), saas_admin can write
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_roles_read_all" ON public.app_roles;
CREATE POLICY "app_roles_read_all" ON public.app_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "app_roles_admin_all" ON public.app_roles;
CREATE POLICY "app_roles_admin_all" ON public.app_roles FOR ALL USING (public.get_auth_role_safe() = 'saas_admin');

ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "config_sistema_read_all" ON public.config_sistema;
CREATE POLICY "config_sistema_read_all" ON public.config_sistema FOR SELECT USING (true);
DROP POLICY IF EXISTS "config_sistema_admin_all" ON public.config_sistema;
CREATE POLICY "config_sistema_admin_all" ON public.config_sistema FOR ALL USING (public.get_auth_role_safe() = 'saas_admin');
