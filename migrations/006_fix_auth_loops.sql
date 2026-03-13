-- ==========================================
-- 🚀 CREATE PAPEIS_DINAMICOS TABLE (FIX 404)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.papeis_dinamicos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
    role_key text NOT NULL,
    allowed_modules text[] DEFAULT '{}'::text[],
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, role_key)
);

-- Enable RLS
ALTER TABLE public.papeis_dinamicos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view roles from their own tenant
DROP POLICY IF EXISTS "View dynamic roles by tenant" ON public.papeis_dinamicos;
CREATE POLICY "View dynamic roles by tenant" ON public.papeis_dinamicos 
FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saas_admin')
);

-- Policy: Only admins or saas_admins can manage roles
DROP POLICY IF EXISTS "Manage dynamic roles" ON public.papeis_dinamicos;
CREATE POLICY "Manage dynamic roles" ON public.papeis_dinamicos 
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'saas_admin'))
);

-- Fix RLS on saas_tenants (Avoid 403 on lookup)
DROP POLICY IF EXISTS "Logged in users can view their own tenant" ON public.saas_tenants;
CREATE POLICY "Logged in users can view their own tenant" ON public.saas_tenants
FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
        id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saas_admin')
    )
);

-- RPC for optimized role fetching
CREATE OR REPLACE FUNCTION public.get_dynamic_roles(p_tenant_id uuid)
RETURNS jsonb AS $$
DECLARE
    roles_map jsonb;
BEGIN
    SELECT jsonb_object_agg(role_key, allowed_modules) INTO roles_map
    FROM public.papeis_dinamicos
    WHERE tenant_id = p_tenant_id;
    
    RETURN COALESCE(roles_map, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';

