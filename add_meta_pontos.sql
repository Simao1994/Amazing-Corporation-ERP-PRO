-- Script para adicionar a Meta de Pontos de Vitória Automática aos Torneios

-- 1. Adicionar a coluna opcional 'meta_pontos' à tabela arena_tournaments
ALTER TABLE public.arena_tournaments 
ADD COLUMN IF NOT EXISTS meta_pontos integer DEFAULT NULL;

-- 2. Recarregar o schema da base de dados para o PostgREST apanhar a nova coluna
NOTIFY pgrst, 'reload schema';

-- 3. CRIAR TABELA DE METAS DE PERFORMANCE (HR)
-- Copie e execute este bloco no SQL Editor do Supabase se o erro persistir
CREATE TABLE IF NOT EXISTS public.hr_metas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    progresso integer DEFAULT 0,
    prazo date NOT NULL,
    status text DEFAULT 'Em curso',
    created_at timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.hr_metas TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
