-- Script para adicionar a Meta de Pontos de Vitória Automática aos Torneios

-- 1. Adicionar a coluna opcional 'meta_pontos' à tabela arena_tournaments
ALTER TABLE public.arena_tournaments 
ADD COLUMN IF NOT EXISTS meta_pontos integer DEFAULT NULL;

-- 2. Recarregar o schema da base de dados para o PostgREST apanhar a nova coluna
NOTIFY pgrst, 'reload schema';
