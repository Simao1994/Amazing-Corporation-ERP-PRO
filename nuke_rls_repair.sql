-- PLAN K: NUCLEAR REPAIR (V11)
-- Purpose: Remove ALL security barriers to diagnose connection
-- WARNING: This disables RLS on critical tables. Use only for debugging!

-- 1. DISABLE RLS ON CORE TABLES
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions DISABLE ROW LEVEL SECURITY;

-- 2. GRANT ALL TO PUBLIC (Extreme measure)
GRANT ALL ON TABLE public.profiles TO public, authenticated, anon;
GRANT ALL ON TABLE public.saas_tenants TO public, authenticated, anon;
GRANT ALL ON TABLE public.saas_subscriptions TO public, authenticated, anon;

-- 3. RESET PERSISTENT RECURSION
DROP FUNCTION IF EXISTS public.get_auth_tenant_safe() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_role_safe() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_direct() CASCADE;

-- 4. RECREATE RPC TABLE COUNT (Safe version)
CREATE OR REPLACE FUNCTION public.get_table_count()
RETURNS integer AS $$
BEGIN
  RETURN (SELECT count(*)::integer FROM pg_tables WHERE schemaname = 'public');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REPAIR ADMIN PERMISSION
-- Ensure the email matches exactly for the master admin
UPDATE public.profiles 
SET role = 'saas_admin', tenant_id = (SELECT id FROM public.saas_tenants LIMIT 1)
WHERE email = 'simaopambo94@gmail.com';

-- 6. Audit Note
-- If the system works after this, the problem was 100% RLS Recursion.
-- We can then re-enable security step-by-step.
