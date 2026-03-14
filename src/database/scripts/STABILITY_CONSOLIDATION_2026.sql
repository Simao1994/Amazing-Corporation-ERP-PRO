-- ================================================================
-- 🛡️ STABILITY & SECURITY CONSOLIDATION 2026
-- Standardizing RLS across ALL core modules for peak stability
-- ================================================================

-- 1. Ensure get_auth_tenant() is modernized and resilient
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN OTHERS THEN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Consolidate RLS for Core Tables
DO $$
DECLARE
    tbl text;
    tables_to_fix text[] := ARRAY[
        'funcionarios', 
        'hr_presencas', 
        'hr_recibos', 
        'hr_metas',
        'rh_contas_bancarias',
        'recr_candidaturas',
        'rh_vagas',      -- Fixed name
        'rh_candidaturas', -- Added name
        'inventario',
        'stock_movimentos',
        'empresas',
        'acc_empresas',
        'config_sistema'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_fix LOOP
        -- Check if table exists before applying fixes
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            
            -- Clean up duplicate or old policies
            EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Tenants isolation" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Master Admin bypass" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Master Admin total access" ON public.%I', tbl);
            
            -- Apply Standardized Tenant Isolation
            EXECUTE format('CREATE POLICY "Tenant isolation" ON public.%I FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant()) WITH CHECK (tenant_id = public.get_auth_tenant())', tbl);
            
            -- Apply Standardized Master Admin Bypass
            EXECUTE format('CREATE POLICY "Master Admin bypass" ON public.%I FOR ALL TO authenticated USING (public.is_master_admin())', tbl);

            -- Ensure tenant_id defaults to the user's tenant for easy inserts
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', tbl);
        END IF;
    END LOOP;
END $$;

-- 3. Fix potential recursion in profiles if exists
DROP POLICY IF EXISTS "Profiles isolation" ON public.profiles;
CREATE POLICY "Profiles isolation" ON public.profiles
FOR ALL TO authenticated
USING (id = auth.uid() OR public.is_master_admin());

-- 4. Reload Schema for UI Refresh
NOTIFY pgrst, 'reload schema';
