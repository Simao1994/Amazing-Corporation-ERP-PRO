-- ==========================================
-- 🏢 MULTI-TENANT DATA MIGRATION
-- ==========================================

-- 1. Create a Default Tenant for existing data
DO $$
DECLARE
    default_tenant_id uuid;
BEGIN
    INSERT INTO public.saas_tenants (nome, slug, status) 
    VALUES ('Amazing Corporation', 'amazing-corp', 'ativo')
    ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO default_tenant_id;

    -- 2. Add tenant_id to profiles and other core tables
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- funcionarios
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funcionarios' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.funcionarios ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.funcionarios SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- rh_contas_bancarias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_contas_bancarias' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.rh_contas_bancarias ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.rh_contas_bancarias SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- hr_presencas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hr_presencas' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.hr_presencas ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.hr_presencas SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- hr_recibos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hr_recibos' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.hr_recibos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- hr_metas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hr_metas' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.hr_metas ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.hr_metas SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- acc_periodos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'acc_periodos' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.acc_periodos ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.acc_periodos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- acc_contas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'acc_contas' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.acc_contas ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.acc_contas SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- acc_lancamentos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'acc_lancamentos' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.acc_lancamentos ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.acc_lancamentos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- arena_pagamentos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arena_pagamentos' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.arena_pagamentos ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
    UPDATE public.arena_pagamentos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

END $$;

-- 3. Set NOT NULL on tenant_id after data is mapped
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.funcionarios ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acc_lancamentos ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function to get current tenant
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 6. Unified Multi-Tenant Policies
-- Example for funcionarios:
DROP POLICY IF EXISTS "Tenants can only see their own employees" ON public.funcionarios;
CREATE POLICY "Tenants can only see their own employees" 
ON public.funcionarios FOR ALL 
USING (tenant_id = public.get_auth_tenant());

-- Example for profiles:
DROP POLICY IF EXISTS "Users can only see profiles from their tenant" ON public.profiles;
CREATE POLICY "Users can only see profiles from their tenant" 
ON public.profiles FOR SELECT 
USING (tenant_id = public.get_auth_tenant());
