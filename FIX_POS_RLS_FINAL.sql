-- ================================================================
-- 🛠️ SOLUÇÃO DEFINITIVA: REPARO DE RLS POS (PONTO DE VENDA)
-- Este script resolve conflitos de "Policy already exists" e 
-- garante o isolamento correto por empresa.
-- ================================================================

-- 1. Limpeza de políticas conflitantes na tabela pos_caixa
DROP POLICY IF EXISTS "RLS_POS_CAIXA_ADMIN_ULTIMATE" ON public.pos_caixa;
DROP POLICY IF EXISTS "Isolamento por empresa_id para pos_caixa" ON public.pos_caixa;
DROP POLICY IF EXISTS "Admins can view all caixa" ON public.pos_caixa;
DROP POLICY IF EXISTS "Users can view own company caixa" ON public.pos_caixa;

-- 2. Limpeza para outras tabelas POS (Prevenção)
DROP POLICY IF EXISTS "Isolamento por empresa_id para pos_categorias" ON public.pos_categorias;
DROP POLICY IF EXISTS "Isolamento por empresa_id para pos_produtos" ON public.pos_produtos;
DROP POLICY IF EXISTS "Isolamento por empresa_id para pos_estoque" ON public.pos_estoque;
DROP POLICY IF EXISTS "Isolamento por empresa_id para pos_faturas" ON public.pos_faturas;

-- 3. Recriar políticas de forma limpa e segura
-- Usamos a função get_auth_tenant() que já está otimizada

-- Tabela: pos_caixa
CREATE POLICY "RLS_POS_CAIXA_TENANT" ON public.pos_caixa
    FOR ALL 
    TO authenticated
    USING (empresa_id = public.get_auth_tenant());

CREATE POLICY "RLS_POS_CAIXA_ADMIN" ON public.pos_caixa
    FOR ALL 
    TO authenticated
    USING (public.is_master_admin());

-- Tabela: pos_categorias
CREATE POLICY "RLS_POS_CATEGORIAS_TENANT" ON public.pos_categorias
    FOR ALL 
    TO authenticated
    USING (empresa_id = public.get_auth_tenant());

-- Tabela: pos_produtos
CREATE POLICY "RLS_POS_PRODUTOS_TENANT" ON public.pos_produtos
    FOR ALL 
    TO authenticated
    USING (empresa_id = public.get_auth_tenant());

-- Tabela: pos_faturas
CREATE POLICY "RLS_POS_FATURAS_TENANT" ON public.pos_faturas
    FOR ALL 
    TO authenticated
    USING (empresa_id = public.get_auth_tenant());

-- 4. Garantir que RLS está habilitado
ALTER TABLE public.pos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_faturas ENABLE ROW LEVEL SECURITY;

-- 5. Verificar estado final
DO $$
BEGIN
    RAISE NOTICE '✅ Reparo de RLS POS concluído com sucesso!';
END $$;
