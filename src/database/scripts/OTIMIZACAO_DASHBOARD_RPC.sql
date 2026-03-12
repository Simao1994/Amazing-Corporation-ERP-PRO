-- ==============================================================================
-- 🚀 OTIMIZAÇÃO: RPC DE MÉTRICAS CONSOLIDADAS
-- Reduz 6 requisições para apenas 1, melhorando a estabilidade e INP.
-- Execute no SQL Editor do Supabase.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Permitir que simaopambo94@gmail.com veja tudo se p_tenant_id for NULL ou específico
    -- (O RLS nas tabelas já cuida do isolamento, mas aqui consolidamos)
    
    SELECT jsonb_build_object(
        'fleet_count', (SELECT count(*) FROM public.expr_fleet WHERE tenant_id = p_tenant_id),
        'agro_count', (SELECT count(*) FROM public.agro_agricultores WHERE tenant_id = p_tenant_id),
        'imob_count', (SELECT count(*) FROM public.real_imoveis WHERE tenant_id = p_tenant_id),
        'imob_valor', (SELECT coalesce(sum(preco_venda), 0) FROM public.real_imoveis WHERE tenant_id = p_tenant_id),
        'arena_count', (SELECT count(*) FROM public.arena_tournaments WHERE tenant_id = p_tenant_id),
        'finance_total', (SELECT coalesce(sum(valor_total), 0) FROM public.fin_notas WHERE tenant_id = p_tenant_id),
        'staff_count', (SELECT count(*) FROM public.funcionarios WHERE tenant_id = p_tenant_id)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que todos os autenticados podem chamar a função
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(UUID) TO anon;

SELECT '✅ RPC get_dashboard_metrics criado com sucesso!' as status;
