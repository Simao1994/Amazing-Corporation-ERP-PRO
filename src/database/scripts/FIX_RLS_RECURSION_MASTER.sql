-- ================================================================
-- 🚀 FIX: RLS RECURSION & MASTER ADMIN STABILITY
-- Resolves TIMEOUT_EXCEEDED by removing database lookups in RLS functions.
-- ================================================================

-- 1. Optimized is_saas_admin (Prioritizes JWT for zero-latency)
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Priority 1: Check Hardcoded Master Admin ID
  IF auth.uid() = 'aee79bd9-edd2-4a36-8e4e-a1b5d0acd1d4' THEN
    RETURN TRUE;
  END IF;

  -- Priority 2: Check JWT user_metadata (metadata set by Supabase Auth)
  IF (auth.jwt() -> 'user_metadata' ->> 'role' = 'saas_admin') THEN
    RETURN TRUE;
  END IF;

  -- Priority 3: Check JWT app_metadata
  IF (auth.jwt() -> 'app_metadata' ->> 'role' = 'saas_admin') THEN
    RETURN TRUE;
  END IF;

  -- Priority 4: Database fallback (only if JWT is missing data)
  -- We use a limited select to avoid heavy recursion if possible
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'saas_admin'
  );
END;
$$;

-- 2. Optimized get_auth_tenant (Eliminates recursion loop)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Priority 1: JWT metadata (Fastest, no DB hit)
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NOT NULL THEN
    RETURN v_tenant_id;
  END IF;

  -- Priority 2: JWT app_metadata
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NOT NULL THEN
    RETURN v_tenant_id;
  END IF;

  -- Priority 3: Database lookup (Only if JWT is empty)
  -- This is where recursion usually happens. 
  -- By putting this last, we solve 99% of cases.
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_tenant_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- 3. Standardize is_master_admin to use the optimized is_saas_admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_saas_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply clean RLS basics to profiles to prevent loops
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles accessibility" ON public.profiles;
CREATE POLICY "Profiles accessibility" ON public.profiles
FOR ALL TO authenticated
USING (
  id = auth.uid() 
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'saas_admin')
  OR
  (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid)
);

-- 5. Final grants
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_saas_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

-- Force reload
NOTIFY pgrst, 'reload schema';
