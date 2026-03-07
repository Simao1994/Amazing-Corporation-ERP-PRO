-- ================================================================
-- 📦 SEED: PLANOS PADRÃO SaaS
-- Execute este script para garantir que existem planos para selecionar.
-- ================================================================

INSERT INTO public.saas_plans (nome, valor, duracao_meses, max_users, features, modules)
VALUES 
('Amazing Standard', 15000, 1, 5, ARRAY['Suporte Email', 'Dashboard Básico'], 'FINANCEIRO, RH'),
('Amazing Professional', 75000, 6, 20, ARRAY['Suporte 24/7', 'Dashboards Avançados', 'Backups'], 'FINANCEIRO, RH, CONTABILIDADE, INVENTARIO'),
('Amazing Enterprise', 120000, 12, 100, ARRAY['Gestor de Conta', 'Customização Total', 'API Access'], 'FINANCEIRO, RH, CONTABILIDADE, INVENTARIO, CRM, VAGAS')
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
