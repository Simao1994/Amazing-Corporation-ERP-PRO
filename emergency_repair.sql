-- PLAN I: EMERGENCY REPAIR (V10)
-- Purpose: Un-wedge the system by any means necessary

-- 1. Disable FORCE RLS everywhere (Important to allow SECURITY DEFINER to work)
DO $$ 
DECLARE 
    t_name text;
BEGIN 
    FOR t_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t_name);
    END LOOP;
END $$;

-- 2. RESET PROFILES TO SIMPLEST POSSIBLE STATE
-- Remove all previous complex policies
DO $$ 
DECLARE 
    p_name text;
BEGIN 
    FOR p_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p_name);
    END LOOP;
END $$;

-- Enable RLS but with a simple, non-recursive policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_emergency_access" ON public.profiles
FOR ALL USING (id = auth.uid());

-- 3. ENSURE ADMIN ACCESS (Using a direct bypass)
-- This allows saas_admin to see everything, but checks role in a way that avoids table recursion
CREATE OR REPLACE FUNCTION public.is_admin_direct() RETURNS boolean AS $$
BEGIN
  -- We use a subquery that should be safe if RLS on profiles is simple
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'saas_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. APPLY REPAIRED UNIVERSAL POLICY
DO $$ 
DECLARE 
    t_name text;
BEGIN 
    FOR t_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('profiles', 'saas_tenants')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "rls_universal_policy_v8" ON %I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "rls_universal_policy_v7" ON %I', t_name);
        
        -- Apply a simple "Admin sees all, others see own tenant" policy
        -- BUT only if tenant_id exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'tenant_id') THEN
            EXECUTE format('CREATE POLICY "rls_universal_v10" ON %I FOR ALL USING (
                public.is_admin_direct()
                OR 
                (tenant_id = public.get_auth_tenant_safe())
            )', t_name);
        ELSE
            EXECUTE format('CREATE POLICY "rls_universal_v10" ON %I FOR ALL USING (
                public.is_admin_direct()
            )', t_name);
        END IF;
    END LOOP;
END $$;

-- 5. REPAIR USER PROFILE (Force role and tenant)
-- Replace with your actual user ID if known, or use email
UPDATE public.profiles 
SET role = 'saas_admin', tenant_id = (SELECT id FROM public.saas_tenants LIMIT 1)
WHERE email = 'simaopambo94@gmail.com';
