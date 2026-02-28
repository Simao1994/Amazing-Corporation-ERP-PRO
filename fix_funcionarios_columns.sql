-- SCRIPT PARA ADICIONAR COLUNAS EM FALTA NA TABELA funcionarios
-- Execute este script no SQL Editor do seu Supabase Dashboard

DO $$ 
BEGIN
    -- 1. Dados de Naturalidade e Origem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='provincia') THEN
        ALTER TABLE public.funcionarios ADD COLUMN provincia text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='municipio') THEN
        ALTER TABLE public.funcionarios ADD COLUMN municipio text;
    END IF;

    -- 2. Filiação
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='nome_pai') THEN
        ALTER TABLE public.funcionarios ADD COLUMN nome_pai text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='nome_mae') THEN
        ALTER TABLE public.funcionarios ADD COLUMN nome_mae text;
    END IF;

    -- 3. Contactos Adicionais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='telefone_alternativo') THEN
        ALTER TABLE public.funcionarios ADD COLUMN telefone_alternativo text;
    END IF;

    -- 4. Garantir que nivel_escolaridade e area_formacao existem (conforme recovery.sql)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='nivel_escolaridade') THEN
        ALTER TABLE public.funcionarios ADD COLUMN nivel_escolaridade text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funcionarios' AND column_name='area_formacao') THEN
        ALTER TABLE public.funcionarios ADD COLUMN area_formacao text;
    END IF;

END $$;

-- Recarregar schema para o API PostgREST
NOTIFY pgrst, 'reload schema';
