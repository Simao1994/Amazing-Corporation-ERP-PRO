-- ==============================================================================
-- 🚀 OTIMIZAÇÃO: RPC DE MÉTRICAS CONSOLIDADAS v2
-- Reduz 6 requisições para apenas 1, com otimização de busca.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Uso de CTE para garantir que o planejador execute as contagens de forma paralela se possível
    WITH metrics AS (
        SELECT
            (SELECT count(*) FROM public.expr_fleet WHERE tenant_id = p_tenant_id) as fleet,
            (SELECT count(*) FROM public.agro_agricultores WHERE tenant_id = p_tenant_id) as agro,
            (SELECT count(*) FROM public.real_imoveis WHERE tenant_id = p_tenant_id) as imob,
            (SELECT coalesce(sum(preco_venda), 0) FROM public.real_imoveis WHERE tenant_id = p_tenant_id) as imob_v,
            (SELECT count(*) FROM public.arena_tournaments WHERE tenant_id = p_tenant_id) as arena,
            (SELECT coalesce(sum(valor_total), 0) FROM public.fin_notas WHERE tenant_id = p_tenant_id) as finance,
            (SELECT count(*) FROM public.funcionarios WHERE tenant_id = p_tenant_id) as staff
    )
    SELECT jsonb_build_object(
        'fleet_count', fleet,
        'agro_count', agro,
        'imob_count', imob,
        'imob_valor', imob_v,
        'arena_count', arena,
        'finance_total', finance,
        'staff_count', staff
    ) INTO result FROM metrics;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que todos os autenticados podem chamar a função
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(UUID) TO anon;

SELECT '✅ RPC get_dashboard_metrics otimizado com sucesso!' as status;
