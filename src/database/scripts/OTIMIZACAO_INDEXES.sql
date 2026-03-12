-- ==============================================================================
-- 🚀 OTIMIZAÇÃO: ÍNDICES PARA MULTI-TENANCY E DASHBOARD
-- Acelera o carregamento de métricas e filtros por tenant_id.
-- ==============================================================================

-- 1. Indexar colas de tenant_id em tabelas críticas
CREATE INDEX IF NOT EXISTS idx_expr_fleet_tenant ON public.expr_fleet(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agro_agricultores_tenant ON public.agro_agricultores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_real_imoveis_tenant ON public.real_imoveis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_arena_tournaments_tenant ON public.arena_tournaments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_notas_tenant ON public.fin_notas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_tenant ON public.funcionarios(tenant_id);

-- 2. Indexar tabelas do POS para performance de venda
CREATE INDEX IF NOT EXISTS idx_pos_estoque_tenant_prod ON public.pos_estoque(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_pos_faturas_caixa ON public.pos_faturas(caixa_id);
CREATE INDEX IF NOT EXISTS idx_pos_movimentos_caixa_tenant ON public.pos_movimentos_caixa(tenant_id);

SELECT '✅ Índices de performance criados com sucesso!' as status;
