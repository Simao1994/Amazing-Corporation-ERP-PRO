
-- ================================================================
-- 🚀 SUPER MEGA MULTI-TENANCY FIX - AMAZING ERP
-- Standardizing tenant isolation across ALL modules
-- ================================================================

DO $$
DECLARE
    default_tenant_id uuid;
BEGIN
    -- 1. Get or Create Default Tenant
    SELECT id INTO default_tenant_id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1;
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.saas_tenants (nome, slug, status) 
        VALUES ('Amazing Corporation', 'amazing-corp', 'ativo')
        RETURNING id INTO default_tenant_id;
    END IF;

    -- 2. Add tenant_id and migrate data for ALL missing tables
    
    -- Financeiro
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_transacoes' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.fin_transacoes ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.fin_transacoes SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'acc_extratos_bancarios' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.acc_extratos_bancarios ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.acc_extratos_bancarios SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- RH / Core
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hr_metas' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.hr_metas ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.hr_metas SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- Configurações (Empresa-specific)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'config_sistema' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.config_sistema ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.config_sistema SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- Garante que o ID do Master Admin esteja correcto nos perfis
    UPDATE public.profiles SET tenant_id = default_tenant_id WHERE email = 'simaopambo94@gmail.com' AND tenant_id IS NULL;

END $$;

-- 3. Set NOT NULL and Enable RLS
DO $$
DECLARE
    tbl text;
    tables_to_fix text[] := ARRAY['fin_transacoes', 'acc_extratos_bancarios', 'hr_metas', 'config_sistema', 'sys_fornecedores', 'inventario', 'stock_movimentos', 'empresas', 'acc_empresas'];
BEGIN
    FOREACH tbl IN ARRAY tables_to_fix LOOP
        -- Set NOT NULL
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', tbl);
        
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        -- Create/Update Policies
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Tenant isolation" ON public.%I FOR ALL USING (tenant_id = public.get_auth_tenant())', tbl);

        -- Bypass policy for Master Admin (Optional but helpful)
        EXECUTE format('DROP POLICY IF EXISTS "Master Admin bypass" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Master Admin bypass" ON public.%I FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''saas_admin'' )', tbl);
    END LOOP;
END $$;

-- 4. Fix get_auth_tenant to be more resilient
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid AS $$
  -- Cache the result in the session to avoid lookups
  SELECT COALESCE(
    current_setting('app.current_tenant_id', true)::uuid,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql STABLE;

-- 5. Helper to set session tenant (to be called via RPC if needed)
CREATE OR REPLACE FUNCTION public.set_session_tenant(t_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', t_id::text, false);
END;
$$ LANGUAGE plpgsql;
