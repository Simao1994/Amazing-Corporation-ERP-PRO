-- ================================================================
-- 🛠️ CORREÇÃO FINAL: REGISTO DE PRODUTOS E RLS POS
-- Padroniza para tenant_id e garante que o trigger de estoque funcione.
-- ================================================================

-- 1. Garantir que as colunas estão padronizadas como tenant_id
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN SELECT unnest(ARRAY['pos_produtos', 'pos_categorias', 'pos_estoque', 'pos_caixa', 'pos_faturas', 'pos_fatura_itens', 'pos_clientes']) 
    LOOP
        -- Renomear empresa_id para tenant_id se existir
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'empresa_id') THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empresa_id TO tenant_id', tbl_name);
        END IF;
    END LOOP;
END $$;

-- 2. Limpar políticas antigas/conflitantes
DROP POLICY IF EXISTS "RLS_POS_PRODUTOS_TENANT" ON public.pos_produtos;
DROP POLICY IF EXISTS "RLS_POS_CATEGORIAS_TENANT" ON public.pos_categorias;
DROP POLICY IF EXISTS "RLS_POS_CAIXA_TENANT" ON public.pos_caixa;
DROP POLICY IF EXISTS "RLS_POS_FATURAS_TENANT" ON public.pos_faturas;
DROP POLICY IF EXISTS "Tenant isolation" ON public.pos_produtos;
DROP POLICY IF EXISTS "Tenant isolation" ON public.pos_categorias;
DROP POLICY IF EXISTS "Tenant isolation" ON public.pos_estoque;
DROP POLICY IF EXISTS "Tenant isolation" ON public.pos_caixa;
DROP POLICY IF EXISTS "Tenant isolation" ON public.pos_faturas;

-- 3. Criar Novas Políticas Robustas
CREATE POLICY "Tenant isolation for pos_produtos" ON public.pos_produtos FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant());
CREATE POLICY "Tenant isolation for pos_categorias" ON public.pos_categorias FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant());
CREATE POLICY "Tenant isolation for pos_estoque" ON public.pos_estoque FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant());
CREATE POLICY "Tenant isolation for pos_caixa" ON public.pos_caixa FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant());
CREATE POLICY "Tenant isolation for pos_faturas" ON public.pos_faturas FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant());
CREATE POLICY "Tenant isolation for pos_clientes" ON public.pos_clientes FOR ALL TO authenticated USING (tenant_id = public.get_auth_tenant());

-- 4. Garantir RLS habilitado em tudo
ALTER TABLE public.pos_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_clientes ENABLE ROW LEVEL SECURITY;

-- 5. Recarregar esquema no PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✅ RLS POS harmonizado com tenant_id!';
END $$;
