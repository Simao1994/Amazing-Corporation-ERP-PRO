-- Script para resolver de vez o problema das Metas (HR)
-- 1. Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS public.hr_metas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    progresso integer DEFAULT 0,
    prazo date NOT NULL,
    status text DEFAULT 'Em curso',
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Garantir permissões de acesso
GRANT ALL ON public.hr_metas TO anon, authenticated, service_role;

-- 3. Configurar RLS (Row Level Security) - VERSÃO ULTRA PERMISSIVA
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

-- 4. Notificar o Supabase para atualizar o cache
NOTIFY pgrst, 'reload schema';
