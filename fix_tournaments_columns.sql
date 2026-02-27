/* SCRIPT: FIX MISSING COLUMNS IN ARENA TOURNAMENTS */

/* Adiciona colunas que podem estar a faltar na tabela arena_tournaments antiga */
ALTER TABLE public.arena_tournaments ADD COLUMN IF NOT EXISTS premio text;
ALTER TABLE public.arena_tournaments ADD COLUMN IF NOT EXISTS game_id uuid;

/* Força a limpeza da cache do schema da API do Supabase para reconhecer a nova coluna imediatamente */
NOTIFY pgrst, 'reload schema';
