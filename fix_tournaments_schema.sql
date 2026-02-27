/* SCRIPT: ATUALIZAÇÕES FINAIS DE TORNEIOS */

/* 1. Remover a restrição rígida do Status (que chumba palavras com acentos diferentes como 'Inscrições') */
ALTER TABLE public.arena_tournaments DROP CONSTRAINT IF EXISTS arena_tournaments_status_check;

/* 2. Adicionar os novos campos de Hora de Início e Termo pedidos pelo utilizador */
ALTER TABLE public.arena_tournaments ADD COLUMN IF NOT EXISTS hora_inicio time;
ALTER TABLE public.arena_tournaments ADD COLUMN IF NOT EXISTS hora_fim time;

/* Forçar atualização da cache */
NOTIFY pgrst, 'reload schema';
