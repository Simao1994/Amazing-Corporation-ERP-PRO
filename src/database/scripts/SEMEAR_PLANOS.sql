-- ================================================================
-- 📦 SEED: PLANOS PADRÃO SaaS
-- Execute este script para garantir que existem planos para selecionar.
-- ================================================================

INSERT INTO public.saas_plans (nome, valor, duracao_meses, max_users, features, modules)
VALUES 
('Amazing Standard', 15000, 1, 5, '["Suporte Email", "Dashboard Básico"]'::jsonb, '["FINANCEIRO", "RH"]'::jsonb),
('Amazing Professional', 75000, 6, 20, '["Suporte 24/7", "Dashboards Avançados", "Backups"]'::jsonb, '["FINANCEIRO", "RH", "CONTABILIDADE", "INVENTARIO"]'::jsonb),
('Amazing Enterprise', 120000, 12, 100, '["Gestor de Conta", "Customização Total", "API Access"]'::jsonb, '["FINANCEIRO", "RH", "CONTABILIDADE", "INVENTARIO", "CRM", "VAGAS"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Garantir que as permissões de leitura estão abertas para administradores
DROP POLICY IF EXISTS "Master Admin can see all plans" ON public.saas_plans;
CREATE POLICY "Master Admin can see all plans" 
ON public.saas_plans 
FOR SELECT 
TO authenticated 
USING (true); -- Planos costumam ser visíveis para todos os autenticados para escolha

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Planos padrão inseridos e permissões de leitura configuradas.';
END $$;
