-- ==========================================
-- 🚀 FULL SAAS MULTI-TENANT SETUP (COMBINED & IDEMPOTENT)
-- ==========================================

-- 1. Create Core SaaS Tables
CREATE TABLE IF NOT EXISTS public.saas_tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    nif text UNIQUE,
    slug text UNIQUE,
    logo_url text,
    config jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'expirado')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL, 
    valor numeric NOT NULL,
    duracao_meses integer NOT NULL,
    features jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES public.saas_plans(id),
    data_inicio date NOT NULL DEFAULT CURRENT_DATE,
    data_expiracao date NOT NULL,
    status text DEFAULT 'pendente' CHECK (status IN ('ativo', 'pendente', 'suspenso', 'expirado')),
    valor_pago numeric,
    comprovativo_url text,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 2. Seed Initial Plans
INSERT INTO public.saas_plans (nome, valor, duracao_meses) VALUES 
('Mensal', 10000, 1),
('Semestral', 50000, 6),
('Anual', 90000, 12)
ON CONFLICT DO NOTHING;

-- 3. Create Default Tenant for Existing Data
DO $$
DECLARE
    default_tenant_id uuid;
BEGIN
    INSERT INTO public.saas_tenants (nome, slug, status) 
    VALUES ('Amazing Corporation', 'amazing-corp', 'ativo')
    ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO default_tenant_id;

    -- 4. Add tenant_id to all business tables
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

-- 5. Helper Function to get current tenant
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 6. Enable RLS and Global Policies
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acc_lancamentos ENABLE ROW LEVEL SECURITY;

-- 7. Policies
DROP POLICY IF EXISTS "Master Admin tenants" ON public.saas_tenants;
CREATE POLICY "Master Admin tenants" ON public.saas_tenants FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saas_admin'));

DROP POLICY IF EXISTS "Tenant view own" ON public.saas_tenants;
CREATE POLICY "Tenant view own" ON public.saas_tenants FOR SELECT USING (id = public.get_auth_tenant());

DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.funcionarios;
CREATE POLICY "Multi-tenant isolation" ON public.funcionarios FOR ALL USING (tenant_id = public.get_auth_tenant());

DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.profiles;
CREATE POLICY "Multi-tenant isolation" ON public.profiles FOR SELECT USING (tenant_id = public.get_auth_tenant());

DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.hr_recibos;
CREATE POLICY "Multi-tenant isolation" ON public.hr_recibos FOR ALL USING (tenant_id = public.get_auth_tenant());

DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.acc_lancamentos;
CREATE POLICY "Multi-tenant isolation" ON public.acc_lancamentos FOR ALL USING (tenant_id = public.get_auth_tenant());

NOTIFY pgrst, 'reload schema';
