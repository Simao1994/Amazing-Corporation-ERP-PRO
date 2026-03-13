-- ========================================================
-- 🚀 SUPER FIX: DATABASE ACCESSIBILITY & STABILITY (FINAL)
-- Resolves: 
-- 1. Permission denied for table users
-- 2. 404 get_dynamic_roles missing
-- 3. 403 saas_tenants access forbidden
-- 4. Infinite RLS Recursion Loops
-- ========================================================

-- 1. UTILITY: get_auth_tenant (Bypasses RLS to find user's tenant)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$;

-- 2. UTILITY: is_saas_admin (Fast check using JWT or profile)
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Priority 1: Check JWT claim (fastest)
  IF (auth.jwt() ->> 'role' = 'saas_admin') THEN
    RETURN TRUE;
  END IF;

  -- Priority 2: Check database profile
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'saas_admin'
  );
END;
$$;

-- 3. CORE: profiles RLS (Ensures users can see themselves and admins can see everyone)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles accessibility" ON public.profiles;
CREATE POLICY "Profiles accessibility" ON public.profiles
FOR ALL USING (
  id = auth.uid() 
  OR 
  tenant_id = public.get_auth_tenant()
  OR
  public.is_saas_admin()
);

-- 4. CORE: saas_tenants RLS (Ensures users can see their own company)
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants accessibility" ON public.saas_tenants;
CREATE POLICY "Tenants accessibility" ON public.saas_tenants
FOR SELECT USING (
  id = public.get_auth_tenant()
  OR
  public.is_saas_admin()
);

-- 5. FUNCTION: get_dynamic_roles (Fixes 404)
CREATE TABLE IF NOT EXISTS public.papeis_dinamicos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
    role_key text NOT NULL,
    allowed_modules text[] DEFAULT '{}'::text[],
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, role_key)
);

CREATE OR REPLACE FUNCTION public.get_dynamic_roles(p_tenant_id uuid)
RETURNS jsonb 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    roles_map jsonb;
BEGIN
    SELECT jsonb_object_agg(role_key, allowed_modules) INTO roles_map
    FROM public.papeis_dinamicos
    WHERE tenant_id = p_tenant_id;
    
    RETURN COALESCE(roles_map, '{}'::jsonb);
END;
$$;

-- 6. PERMISSIONS: Ensure anon/authenticated have access to call functions
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_saas_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dynamic_roles(uuid) TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
