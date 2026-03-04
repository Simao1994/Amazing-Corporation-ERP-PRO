-- ==========================================
-- 🚀 FIX RLS RECURSION (get_auth_tenant)
-- ==========================================

-- 1. Redefine get_auth_tenant as SECURITY DEFINER
-- This allows it to query the profiles table without triggering RLS recursively.
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- 2. Ensure execution permissions
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO service_role;

-- 3. Re-apply CORE multi-tenant policies to ensure stability
-- Profiles (Self access and same tenant access)
DROP POLICY IF EXISTS "Users can only see profiles from their tenant" ON public.profiles;
CREATE POLICY "Users can only see profiles from their tenant" 
ON public.profiles FOR SELECT 
TO authenticated
USING (tenant_id = get_auth_tenant() OR id = auth.uid());

-- Funcionários
DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.funcionarios;
DROP POLICY IF EXISTS "Tenants can only see their own employees" ON public.funcionarios;
CREATE POLICY "Multi-tenant isolation" 
ON public.funcionarios FOR ALL 
TO authenticated
USING (tenant_id = get_auth_tenant());

-- Recibos
DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.hr_recibos;
CREATE POLICY "Multi-tenant isolation" 
ON public.hr_recibos FOR ALL 
TO authenticated
USING (tenant_id = get_auth_tenant());

-- Presenças
DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.hr_presencas;
CREATE POLICY "Multi-tenant isolation" 
ON public.hr_presencas FOR ALL 
TO authenticated
USING (tenant_id = get_auth_tenant());

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
