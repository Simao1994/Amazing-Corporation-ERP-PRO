-- PLAN G: FINAL ULTIMATE RLS FIX
-- Purpose: Break RLS recursion and fix infinite loading

-- 1. Create robust, non-recursive helper functions in public schema
CREATE OR REPLACE FUNCTION public.get_auth_tenant_safe() RETURNS uuid AS $$
  -- SECURITY DEFINER ensures this runs as 'postgres', bypassing RLS on the profiles table
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_role_safe() RETURNS text AS $$
  -- SECURITY DEFINER ensures this runs as 'postgres', bypassing RLS on the profiles table
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Clean up ALL previous dynamic policies to avoid conflicts
DO $$ 
DECLARE 
    t_name text;
    p_name text;
BEGIN 
    FOR t_name, p_name IN 
        SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' 
    LOOP
        -- Only drop policies that we likely created (rls_dynamic_policy, rls_universal_policy, etc)
        IF p_name LIKE 'rls%' OR p_name LIKE 'profiles_access%' OR p_name LIKE 'saas_%_access%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_name, t_name);
        END IF;
    END LOOP;
END $$;

-- 3. SPECIFIC RIGID POLICY FOR PROFILES (To avoid recursion)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_access_v7" ON public.profiles;
CREATE POLICY "profiles_access_v7" ON public.profiles
FOR ALL
USING (
    -- Direct check without function call to avoid initial recursion
    id = auth.uid() 
    OR 
    -- This function call is safe here because it runs as SECURITY DEFINER
    public.get_auth_role_safe() = 'saas_admin'
);

-- 4. APPLY UNIVERSAL POLICY TO ALL BUSINESS TABLES
DO $$ 
DECLARE 
    t_name text;
BEGIN 
    FOR t_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('profiles', 'saas_tenants', 'saas_subscriptions', 'saas_plans') -- Skip structural tables with custom policies
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "rls_universal_policy_v7" ON %I', t_name);
            EXECUTE format('CREATE POLICY "rls_universal_policy_v7" ON %I USING (
                public.get_auth_role_safe() = ''saas_admin''
                OR 
                (tenant_id = public.get_auth_tenant_safe())
            )', t_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping table %: %', t_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 5. Special policies for structural tables
-- saas_tenants: saas_admin can see all, tenant users see their own
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saas_tenants_access_v7" ON public.saas_tenants
FOR ALL
USING (
    public.get_auth_role_safe() = 'saas_admin'
    OR 
    id = public.get_auth_tenant_safe()
);

-- saas_subscriptions: saas_admin can see all, tenant users see their own
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saas_subscriptions_access_v7" ON public.saas_subscriptions
FOR ALL
USING (
    public.get_auth_role_safe() = 'saas_admin'
    OR 
    tenant_id = public.get_auth_tenant_safe()
);

