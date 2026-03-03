
-- Migration: Fix RLS recursion and ensure saas_admin stability
-- Date: 2026-03-03

-- 1. Create SECURITY DEFINER function to check saas_admin role without RLS recursion
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

-- 2. Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_saas_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_saas_admin() TO service_role;

-- 3. Update profiles RLS policies
DROP POLICY IF EXISTS "saas_admin_all_profiles" ON public.profiles;
CREATE POLICY "saas_admin_all_profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (is_saas_admin());

DROP POLICY IF EXISTS "user_own_tenant_profiles" ON public.profiles;
CREATE POLICY "user_own_tenant_profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant()
  OR id = auth.uid()
);

-- 4. Update SaaS tables RLS policies
DROP POLICY IF EXISTS "Master Admin tenants" ON public.saas_tenants;
CREATE POLICY "Master Admin tenants" ON public.saas_tenants
FOR ALL
TO authenticated
USING (is_saas_admin());

DROP POLICY IF EXISTS "Master Admin manage subscriptions" ON public.saas_subscriptions;
CREATE POLICY "Master Admin manage subscriptions" ON public.saas_subscriptions
FOR ALL
TO authenticated
USING (is_saas_admin());

DROP POLICY IF EXISTS "Master Admin manage plans" ON public.saas_plans;
CREATE POLICY "Master Admin manage plans" ON public.saas_plans
FOR ALL
TO authenticated
USING (is_saas_admin());

-- 5. Ensure Tenant access
DROP POLICY IF EXISTS "Tenant view own" ON public.saas_tenants;
CREATE POLICY "Tenant view own" ON public.saas_tenants
FOR SELECT
TO authenticated
USING (id = get_auth_tenant());

DROP POLICY IF EXISTS "Tenant view own subscription" ON public.saas_subscriptions;
CREATE POLICY "Tenant view own subscription" ON public.saas_subscriptions
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant());
