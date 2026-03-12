-- ================================================================
-- 📊 RPC PARA MONITORIZAÇÃO DE INFRAESTRUTURA (SaaS MASTER)
-- Consolida contagem de registros das tabelas críticas para o Dashboard Admin.
-- Evita múltiplas chamadas individuais que causam TIMEOUT.
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_system_tables_status()
RETURNS TABLE (
    name text,
    rows bigint,
    status text,
    latency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'profiles', 'saas_tenants', 'saas_plans', 'saas_subscriptions', 
            'funcionarios', 'departamentos', 'agro_producao', 'frota_veiculos',
            'financeiro_transacoes', 'pos_vendas', 'pos_produtos', 'crm_leads',
            'real_imoveis', 'manutencao_ordens', 'rh_folha_pagamento'
        )
    LOOP
        EXECUTE format('SELECT %L, count(*), %L, %L FROM %I', t_name, 'online', 'Sub-ms', t_name)
        INTO name, rows, status, latency;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- Grant execution to authenticated users (Dashboard Admin)
GRANT EXECUTE ON FUNCTION public.get_system_tables_status() TO authenticated;
