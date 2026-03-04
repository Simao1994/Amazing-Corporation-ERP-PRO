-- ==========================================
-- 🛠️ FIX PROFILES RLS & VISIBILITY
-- ==========================================

-- 1. Improve is_saas_admin to include email fallback and skip RLS
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Essential: runs with postgres privileges to avoid recursion
SET search_path = public
AS $$
BEGIN
  RETURN (
    -- Check by record in profiles
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'saas_admin' OR role = 'admin')
    )
    OR 
    -- Fallback by email (Master Admin)
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'simaopambo94@gmail.com'
  );
END;
$$;

-- 2. Fix get_auth_tenant to avoid recursion
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER -- Essential: bypasses RLS on the profiles table query below
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. Update Profiles Policies
-- Remove old ones
DROP POLICY IF EXISTS "saas_admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_own_tenant_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only see profiles from their tenant" ON public.profiles;

-- 3.1. Master Admin Policy: See everything
CREATE POLICY "saas_admin_all_profiles" 
ON public.profiles
FOR ALL 
TO authenticated
USING (is_saas_admin());

-- 3.2. Regular User Policy: See tenant members + self
CREATE POLICY "user_own_tenant_profiles" 
ON public.profiles
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant() 
  OR id = auth.uid()
);

-- 4. Audit/Log
COMMENT ON FUNCTION public.is_saas_admin() IS 'Checks if user is a SaaS admin or global admin, includes email fallback.';
COMMENT ON FUNCTION public.get_auth_tenant() IS 'Returns the current users tenant_id, bypassing RLS to avoid recursion.';
