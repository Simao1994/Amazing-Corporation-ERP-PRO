-- ==============================================================================
-- 🚀 OTIMIZAÇÃO MAXIMA: ÍNDICES PARA MULTI-TENANCY, POS E DASHBOARD
-- Acelera o carregamento de métricas, filtros por tenant_id, e resolve 
-- problemas de LockManager e Timeouts no Supabase causados por Full Table Scans.
-- ==============================================================================

-- 1. INDEXAÇÃO DA BASE (EMPRESAS E UTILIZADORES)
CREATE INDEX IF NOT EXISTS idx_empresas_id ON public.empresas(id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 2. INDEXAÇÃO DO MÓDULO POS (Ponto de Venda)
-- Tabelas baseadas em tenant_id
CREATE INDEX IF NOT EXISTS idx_pos_categorias_tenant ON public.pos_categorias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_produtos_tenant ON public.pos_produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_estoque_tenant ON public.pos_estoque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_movimento_stock_tenant ON public.pos_movimento_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_caixa_tenant ON public.pos_caixa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_faturas_tenant ON public.pos_faturas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_fatura_itens_tenant ON public.pos_fatura_itens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_movimentos_caixa_tenant ON public.pos_movimentos_caixa(tenant_id);

-- Ligações de Chave Estrangeira do POS (Prevenção de Locks recursivos)
CREATE INDEX IF NOT EXISTS idx_pos_produtos_categoria_id ON public.pos_produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pos_estoque_produto_id ON public.pos_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_pos_movimento_stock_produto_id ON public.pos_movimento_stock(produto_id);
CREATE INDEX IF NOT EXISTS idx_pos_faturas_caixa_id ON public.pos_faturas(caixa_id);
CREATE INDEX IF NOT EXISTS idx_pos_fatura_itens_fatura_id ON public.pos_fatura_itens(fatura_id);
CREATE INDEX IF NOT EXISTS idx_pos_fatura_itens_produto_id ON public.pos_fatura_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pos_movimentos_caixa_caixa_id ON public.pos_movimentos_caixa(caixa_id);

-- Combinações Frequentes usadas em RLS e Consultas POS
CREATE INDEX IF NOT EXISTS idx_pos_produtos_tenant_ativo ON public.pos_produtos(tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_pos_estoque_tenant_produto ON public.pos_estoque(tenant_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_pos_caixa_tenant_usuario ON public.pos_caixa(tenant_id, usuario_id);

-- 3. OUTRAS TABELAS CRÍTICAS DE NEGÓCIO E MULTI-TENANCY
CREATE INDEX IF NOT EXISTS idx_expr_fleet_tenant ON public.expr_fleet(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agro_agricultores_tenant ON public.agro_agricultores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_real_imoveis_tenant ON public.real_imoveis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_arena_tournaments_tenant ON public.arena_tournaments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_notas_tenant ON public.fin_notas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_tenant ON public.funcionarios(tenant_id);

-- 4. ÍNDICES DE ORDENAÇÃO (Frequentes em Dashboards)
CREATE INDEX IF NOT EXISTS idx_pos_faturas_data_emissao ON public.pos_faturas(data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_pos_caixa_data_abertura ON public.pos_caixa(data_abertura DESC);
CREATE INDEX IF NOT EXISTS idx_pos_movimento_stock_data ON public.pos_movimento_stock(data DESC);

SELECT '✅ Índices Massivos de Performance criados para prevenir Timeouts!' as status;
