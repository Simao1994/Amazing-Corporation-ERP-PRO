-- SCRIPT PARA CORRIGIR COLUNAS EM FALTA NA TABELA hr_recibos
-- Execute este script no SQL Editor do seu Supabase Dashboard

DO $$ 
BEGIN
    -- Adicionar coluna 'cargo' se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='cargo') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN cargo text;
    END IF;

    -- Adicionar coluna 'bilhete' se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='bilhete') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN bilhete text;
    END IF;

    -- Garantir que as outras colunas de subsídios também existem (caso tenham falhado em migrações anteriores)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='subsidio_ferias') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN subsidio_ferias numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='subsidio_natal') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN subsidio_natal numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='faltas_desconto') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN faltas_desconto numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='inss_trabalhador') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN inss_trabalhador numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='irt') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN irt numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_recibos' AND column_name='data_emissao') THEN
        ALTER TABLE public.hr_recibos ADD COLUMN data_emissao timestamp with time zone DEFAULT now();
    END IF;

END $$;
