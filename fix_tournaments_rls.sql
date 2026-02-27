/* SCRIPT: FORÇAR DESBLOQUEIO TOTAL DOS TORNEIOS */

/* 1. Garantir que a segurança da linha está ativada */
ALTER TABLE public.arena_tournaments ENABLE ROW LEVEL SECURITY;

/* 2. Remover TODAS as políticas antigas que possam estar a causar conflito */
DROP POLICY IF EXISTS "Permitir leitura publica de arena_tournaments" ON public.arena_tournaments;
DROP POLICY IF EXISTS "Permitir tudo a autenticados em arena_tournaments" ON public.arena_tournaments;
DROP POLICY IF EXISTS "Permitir_Select_Tournament" ON public.arena_tournaments;
DROP POLICY IF EXISTS "Permitir_Insert_Tournament" ON public.arena_tournaments;
DROP POLICY IF EXISTS "Permitir_Update_Tournament" ON public.arena_tournaments;
DROP POLICY IF EXISTS "Permitir_Delete_Tournament" ON public.arena_tournaments;

/* 3. Criar políticas irrestritas (para todas as rotas da API: authenticated e anon) */
CREATE POLICY "Permitir_Select_Tournament" ON public.arena_tournaments FOR SELECT USING (true);
CREATE POLICY "Permitir_Insert_Tournament" ON public.arena_tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir_Update_Tournament" ON public.arena_tournaments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir_Delete_Tournament" ON public.arena_tournaments FOR DELETE USING (true);

/* Largar cache */
NOTIFY pgrst, 'reload schema';
