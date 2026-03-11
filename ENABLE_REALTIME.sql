-- =============================================================
-- 🚀 ATIVAR SUPABASE REALTIME PARA TABELAS ERP
-- Garante que as alterações sejam propagadas instantaneamente
-- =============================================================

-- 1. Verificar se a publicação 'supabase_realtime' existe, se não, criar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Adicionar tabelas à publicação realtime
-- Nota: Se a tabela já estiver lá, nada acontece
ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.pos_categorias,
    public.pos_produtos,
    public.pos_clientes,
    public.pos_caixa,
    public.pos_faturas,
    public.pos_fatura_itens,
    public.inventario,
    public.stock_movimentos,
    public.pos_movimentos_caixa,
    public.fin_notas,
    public.sys_ads;

-- 3. Garantir que as tabelas têm REPLICA IDENTITY FULL
-- Isso garante que as notificações contenham todos os dados da linha (antigos e novos)
ALTER TABLE public.pos_categorias REPLICA IDENTITY FULL;
ALTER TABLE public.pos_produtos REPLICA IDENTITY FULL;
ALTER TABLE public.pos_clientes REPLICA IDENTITY FULL;
ALTER TABLE public.pos_caixa REPLICA IDENTITY FULL;
ALTER TABLE public.pos_faturas REPLICA IDENTITY FULL;
ALTER TABLE public.pos_fatura_itens REPLICA IDENTITY FULL;
ALTER TABLE public.inventario REPLICA IDENTITY FULL;
ALTER TABLE public.stock_movimentos REPLICA IDENTITY FULL;
ALTER TABLE public.pos_movimentos_caixa REPLICA IDENTITY FULL;
ALTER TABLE public.fin_notas REPLICA IDENTITY FULL;
ALTER TABLE public.sys_ads REPLICA IDENTITY FULL;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Realtime ativado para as tabelas principais do ERP.';
END $$;
