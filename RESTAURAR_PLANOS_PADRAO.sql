-- ==========================================
-- 📋 RESTAURAÇÃO DE PLANOS PADRÃO
-- Execute este script no SQL Editor do Supabase.
-- ==========================================

-- 1. Garantir que as colunas extras existem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'max_users') THEN
        ALTER TABLE public.saas_plans ADD COLUMN max_users integer DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'modules') THEN
        ALTER TABLE public.saas_plans ADD COLUMN modules text[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Inserir Planos Padrão do Sistema
INSERT INTO public.saas_plans (id, nome, valor, duracao_meses, max_users, modules, features) VALUES 
('00000000-0000-0000-0000-000000000101', 'Mensal', 10000, 1, 10, '["RH", "FINANCEIRO"]', '{"suporte": "email", "backup": "diario"}'),
('00000000-0000-0000-0000-000000000102', 'Semestral', 50000, 6, 25, '["RH", "FINANCEIRO", "CRM"]', '{"suporte": "prioritario", "backup": "diario"}'),
('00000000-0000-0000-0000-000000000103', 'Anual', 90000, 12, 100, '["RH", "FINANCEIRO", "CRM", "FROTA", "ALL"]', '{"suporte": "24/7", "backup": "tempo real"}')
ON CONFLICT (id) DO UPDATE SET 
    nome = EXCLUDED.nome,
    valor = EXCLUDED.valor,
    duracao_meses = EXCLUDED.duracao_meses,
    max_users = EXCLUDED.max_users,
    modules = EXCLUDED.modules,
    features = EXCLUDED.features;

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO: 3 Planos (Mensal, Semestral, Anual) restaurados na base de dados.';
END $$;
