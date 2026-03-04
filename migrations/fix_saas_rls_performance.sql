-- ==========================================
-- 🚀 OPTIMIZE SAAS RLS PERFORMANCE
-- ==========================================

-- 1. Ensure indexes exist for common RLS filter columns
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_tenant_id ON public.saas_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status ON public.saas_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Refine is_saas_admin to be as fast as possible
-- It uses SECURITY DEFINER to bypass RLS on profiles table itself.
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple check against the profiles table using auth.uid()
  -- The index on id (Primary Key) and role (just added) makes this very fast.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'saas_admin'
  );
END;
$$;

-- 3. Grant execution (just in case it was lost)
GRANT EXECUTE ON FUNCTION public.is_saas_admin() TO authenticated;

-- 4. Re-apply policies to ensure they use the optimized check
DROP POLICY IF EXISTS "Master Admin tenants" ON public.saas_tenants;
CREATE POLICY "Master Admin tenants" ON public.saas_tenants
FOR ALL TO authenticated USING (is_saas_admin());

DROP POLICY IF EXISTS "Master Admin manage subscriptions" ON public.saas_subscriptions;
CREATE POLICY "Master Admin manage subscriptions" ON public.saas_subscriptions
FOR ALL TO authenticated USING (is_saas_admin());

DROP POLICY IF EXISTS "Master Admin manage plans" ON public.saas_plans;
CREATE POLICY "Master Admin manage plans" ON public.saas_plans
FOR ALL TO authenticated USING (is_saas_admin());

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
