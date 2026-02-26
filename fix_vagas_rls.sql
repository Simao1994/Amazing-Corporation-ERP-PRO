-- =========================================================================================
-- CORREÇÃO DE SEGURANÇA (RLS) PARA A TABELA DE VAGAS
-- Roda isto no SQL Editor do Supabase (Mesmo Projecto: jgktemwegesmmomlftgt)
-- =========================================================================================

-- 1. Apagar as políticas antigas que podiam estar a causar conflito
DROP POLICY IF EXISTS "RH Admin controla vagas" ON public.rh_vagas;
DROP POLICY IF EXISTS "RH insere vagas" ON public.rh_vagas;
DROP POLICY IF EXISTS "RH atualiza vagas" ON public.rh_vagas;

-- 2. Criar políticas super resilientes separadas para cada ação do RH
-- O "TO authenticated" garante que o utilizador tem token válido do Supabase.

-- Permissão para INSERIR (Nova Vaga)
CREATE POLICY "RH insere vagas" ON public.rh_vagas 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Permissão para ATUALIZAR (Editar Vaga)
CREATE POLICY "RH atualiza vagas" ON public.rh_vagas 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Permissão para APAGAR (Remover Vaga)
CREATE POLICY "RH apaga vagas" ON public.rh_vagas 
  FOR DELETE TO authenticated USING (true);

-- Permissão de LER (que os Admins precisam além da pública)
CREATE POLICY "RH le tudo vagas" ON public.rh_vagas 
  FOR SELECT TO authenticated USING (true);

-- Forçar limpeza de memória do Supabase
NOTIFY pgrst, 'reload schema';
