-- ==========================================
-- 💎 LAPIDAÇÃO SaaS: SCHEMA ENHANCEMENTS
-- Adiciona suporte a limites de utilizadores, módulos e fluxos de aprovação.
-- ==========================================

-- 1. Actualizar saas_plans para suportar Limites e Módulos Detalhados
ALTER TABLE public.saas_plans 
ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS modules text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}';

-- 2. Actualizar saas_subscriptions para suportar Fluxos de Aprovação e Histórico
ALTER TABLE public.saas_subscriptions
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_pagamento timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

-- 3. Actualizar Planos Existentes com Dados de Exemplo (Standardização)
-- Plano Starter / Mensal
UPDATE public.saas_plans 
SET 
  max_users = 3, 
  modules = ARRAY['RH', 'PONTO', 'EMPRESAS', 'BLOG'],
  features = ARRAY['Gestão de RH Básica', 'Controle de Ponto', 'Até 3 Utilizadores'],
  nome = 'Starter'
WHERE nome = 'Mensal';

-- Plano Semestral
UPDATE public.saas_plans 
SET 
  max_users = 15, 
  modules = ARRAY['RH', 'PONTO', 'FINANCEIRO', 'LOGISTICA', 'EMPRESAS', 'BLOG'],
  features = ARRAY['Gestão Financeira', 'Logística Básica', 'Módulos de RH Avançados', 'Até 15 Utilizadores'],
  nome = 'Business'
WHERE nome = 'Semestral';

-- Plano Anual
UPDATE public.saas_plans 
SET 
  max_users = 100, 
  modules = ARRAY['ALL'],
  features = ARRAY['Acesso a Todos os Módulos', 'Suporte Prioritário 24/7', 'Utilizadores Ilimitados*', 'Backups Diários'],
  nome = 'Enterprise'
WHERE nome = 'Anual';

-- 4. Garantir que o Plano Master Admin (Simulado) tem tudo
-- (Nota: O SaaSContext já simula, mas se usarmos BD para o master admin...)
-- Não alteramos o Root tenant para não quebrar acesso.

NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SCHEMA SaaS LAPIDADO: Módulos e limites configurados com sucesso.';
END $$;
