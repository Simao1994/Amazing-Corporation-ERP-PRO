-- ================================================================
-- 💰 FIX FINANCEIRO & TESOURARIA: POLÍTICAS RLS
-- Este script garante que o Master Admin tenha acesso total
-- às tabelas de finanças e contabilidade.
-- ================================================================

-- 1. Habilitar RLS nas tabelas financeiras (se ainda não estiverem)
ALTER TABLE IF EXISTS public.acc_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.acc_extratos_bancarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contabil_faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.acc_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.acc_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.acc_lancamentos ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza de políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Master Admin Fin Empresas" ON public.acc_empresas;
DROP POLICY IF EXISTS "Master Admin Fin Transacoes" ON public.fin_transacoes;
DROP POLICY IF EXISTS "Master Admin Fin Extratos" ON public.acc_extratos_bancarios;
DROP POLICY IF EXISTS "Master Admin Faturas" ON public.contabil_faturas;
DROP POLICY IF EXISTS "Master Admin Contas" ON public.acc_contas;
DROP POLICY IF EXISTS "Master Admin Periodos" ON public.acc_periodos;
DROP POLICY IF EXISTS "Master Admin Lancamentos" ON public.acc_lancamentos;

-- 3. Criar políticas de ACESSO TOTAL para Master Admin (saas_admin)
-- Nota: Usamos a função is_master_admin() definida no MEGA-FIX anterior.

CREATE POLICY "Master Admin Fin Empresas" ON public.acc_empresas FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Fin Transacoes" ON public.fin_transacoes FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Fin Extratos" ON public.acc_extratos_bancarios FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Faturas" ON public.contabil_faturas FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Contas" ON public.acc_contas FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Periodos" ON public.acc_periodos FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Lancamentos" ON public.acc_lancamentos FOR ALL TO authenticated USING (is_master_admin());

-- 4. Criar políticas de visibilidade básica para usuários comuns (opcional, mas recomendado)
-- Por agora, focamos no Master Admin para desbloquear o sistema.

DO $$
BEGIN
    RAISE NOTICE '✅ SUCESSO: Políticas financeiras aplicadas para Master Admin.';
END $$;
