-- ============================================================
-- AMAZING ERP - Recriar Plano SaaS Perdido
-- Colar este SQL no Supabase SQL Editor e clicar RUN
-- ============================================================

-- 1. Recriar o plano com o UUID exacto que a subscricao referencia
INSERT INTO saas_plans (id, nome, valor, duracao_meses, max_users, modules, features)
VALUES (
  '7a672043-32ee-4139-980c-411ac7d5382d',
  'Amazing Enterprise Full',
  90000,
  12,
  9999,
  '["ALL"]'::jsonb,
  '["Acesso Total", "RH", "Financeiro", "Transportes", "Inventário", "Contabilidade", "Arena", "Agro", "Imobiliário"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  modules = EXCLUDED.modules,
  features = EXCLUDED.features,
  max_users = EXCLUDED.max_users;

-- 2. Garantir que a subscricao esta activa e com a data de expiracao correcta
UPDATE saas_subscriptions
SET
  status = 'ativo',
  data_expiracao = '2027-03-03',
  auto_renew = true
WHERE tenant_id = 'a50153f1-6844-481b-be96-8de3e5e768cf';

-- 3. Verificar o resultado final
SELECT
  s.id as sub_id,
  s.status,
  s.data_expiracao,
  p.nome as plano,
  p.modules
FROM saas_subscriptions s
LEFT JOIN saas_plans p ON s.plan_id = p.id
WHERE s.tenant_id = 'a50153f1-6844-481b-be96-8de3e5e768cf';
