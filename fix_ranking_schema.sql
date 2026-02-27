-- Script para corrigir a coluna last_game da tabela arena_ranking
-- A coluna foi acidentalmente criada como 'date' no script original, mas o frontend envia o nome do jogo (texto).

ALTER TABLE public.arena_ranking 
ALTER COLUMN last_game TYPE text USING last_game::text;

-- Caso a conversão direta falhe por conter datas inválidas, o bloco abaixo pode ser usado em alternativa:
-- ALTER TABLE public.arena_ranking DROP COLUMN last_game;
-- ALTER TABLE public.arena_ranking ADD COLUMN last_game text;

NOTIFY pgrst, 'reload schema';
