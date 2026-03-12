-- ================================================================
-- 🏆 CONFIGURAÇÃO DO SAAS: AUTO-RENOVAÇÃO E IBAN DINÂMICO
-- Execute este script no SQL Editor do Supabase para aplicar.
-- ================================================================

-- 1. Assegurar que a coluna auto_renew existe na tabela de subscrições
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='saas_subscriptions' AND column_name='auto_renew'
    ) THEN
        ALTER TABLE public.saas_subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna auto_renew adicionada a saas_subscriptions.';
    ELSE
        RAISE NOTICE '✅ Coluna auto_renew já existe.';
    END IF;
END $$;

-- 2. Criar tabela de configuração global do SaaS para IBAN dinâmico
CREATE TABLE IF NOT EXISTS public.saas_config (
    id integer PRIMARY KEY DEFAULT 1,
    banco text NOT NULL DEFAULT 'Banco BAI',
    iban text NOT NULL DEFAULT 'AO06 0000 0000 8921 3451 2',
    beneficiario text NOT NULL DEFAULT 'Amazing Corporation Software LDA',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Inserir a linha inicial se não existir
INSERT INTO public.saas_config (id, banco, iban, beneficiario)
VALUES (1, 'Banco BAI', 'AO06 0000 0000 8921 3451 2', 'Amazing Corporation Software LDA')
ON CONFLICT (id) DO NOTHING;

-- 4. Desativar RLS para permitir leitura e escrita fáceis pela aplicação
ALTER TABLE public.saas_config DISABLE ROW LEVEL SECURITY;

-- 5. Função de atualização automática do timestamp
CREATE OR REPLACE FUNCTION public.update_saas_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saas_config_updated_at ON public.saas_config;
CREATE TRIGGER trg_saas_config_updated_at
BEFORE UPDATE ON public.saas_config
FOR EACH ROW
EXECUTE FUNCTION public.update_saas_config_updated_at();

DO $$
BEGIN 
    RAISE NOTICE '✅ Tabela saas_config criada e pronta para uso!';
END $$;
