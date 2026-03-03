-- ==========================================
-- 🚀 SAAS CORE INFRASTRUCTURE
-- ==========================================

-- 1. Tenants (Companies)
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

-- 2. Subscription Plans
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL, -- 'Mensal', 'Semestral', 'Anual'
    valor numeric NOT NULL,
    duracao_meses integer NOT NULL,
    features jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 3. Subscriptions
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

-- 4. Initial Plans
INSERT INTO public.saas_plans (nome, valor, duracao_meses) VALUES 
('Mensal', 10000, 1),
('Semestral', 50000, 6),
('Anual', 90000, 12)
ON CONFLICT DO NOTHING;

-- 5. Enable RLS on SaaS tables (Master Admin only for plans, Tenant only for own data)
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
