-- Script para adicionar a Meta de Pontos de Vitória Automática aos Torneios

-- 1. Adicionar a coluna opcional 'meta_pontos' à tabela arena_tournaments
ALTER TABLE public.arena_tournaments 
ADD COLUMN IF NOT EXISTS meta_pontos integer DEFAULT NULL;

-- 2. Recarregar o schema da base de dados para o PostgREST apanhar a nova coluna
NOTIFY pgrst, 'reload schema';

-- 4. CONFIGURAR RLS (Row Level Security) - VERSÃO ULTRA PERMISSIVA
ALTER TABLE public.hr_metas ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.hr_metas;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON public.hr_metas;

-- Criar nova política que permite TUDO para qualquer utilizador (anon e authenticated)
CREATE POLICY "Permitir tudo para todos" 
ON public.hr_metas FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
