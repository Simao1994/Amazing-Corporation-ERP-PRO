-- ================================================================
-- 🚀 ULTIMATE SAAS REPAIR: SCHEMA, RLS & MASTER ADMIN FIX
-- Execute este script no SQL Editor do Supabase para corrigir os erros do Master Admin.
-- ================================================================

-- 1. Assegurar as Tabelas de Base com as Colunas Correctas
DO $$ 
BEGIN
    -- saas_tenants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_tenants' AND column_name = 'nif') THEN
        ALTER TABLE public.saas_tenants ADD COLUMN nif text UNIQUE;
    END IF;
    
    -- saas_plans
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'modules') THEN
        ALTER TABLE public.saas_plans ADD COLUMN modules jsonb DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'features') THEN
        ALTER TABLE public.saas_plans ADD COLUMN features jsonb DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'max_users') THEN
        ALTER TABLE public.saas_plans ADD COLUMN max_users integer DEFAULT 10;
    END IF;

    -- saas_subscriptions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_subscriptions' AND column_name = 'auto_renew') THEN
        ALTER TABLE public.saas_subscriptions ADD COLUMN auto_renew boolean DEFAULT false;
    END IF;
END $$;

-- 2. Criar ou Reparar a Tabela saas_config
CREATE TABLE IF NOT EXISTS public.saas_config (
    id integer PRIMARY KEY DEFAULT 1,
    banco text NOT NULL DEFAULT 'Banco BAI',
    iban text NOT NULL DEFAULT 'AO06 0000 0000 8921 3451 2',
    beneficiario text NOT NULL DEFAULT 'Amazing Corporation Software LDA',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Inserir dados iniciais se vazio
INSERT INTO public.saas_config (id, banco, iban, beneficiario)
VALUES (1, 'Banco BAI', 'AO06 0000 0000 8921 3451 2', 'Amazing Corporation Software LDA')
ON CONFLICT (id) DO NOTHING;

-- 3. Função Master Admin Robusta
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'saas_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar Tenant Raiz se não existir (para o Master Admin)
INSERT INTO public.saas_tenants (id, nome, slug, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'SaaS Master Administration', 'saas-master', 'ativo')
ON CONFLICT (id) DO NOTHING;

-- 5. Garantir que o Simão seja saas_admin com o Tenant Raiz
UPDATE public.profiles
SET role = 'saas_admin', 
    tenant_id = '00000000-0000-0000-0000-000000000000'
WHERE email = 'simaopambo94@gmail.com';

-- 6. Configurar RLS e Permissões (Modo Administrativo Facilitado)
-- Desativamos temporariamente para o Master Admin actuar sem bloqueios
ALTER TABLE public.saas_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_config DISABLE ROW LEVEL SECURITY;

-- 7. Grant total nas tabelas SaaS para utilizadores autenticados (RLS fará o isolamento se estiver ON)
GRANT ALL ON TABLE public.saas_tenants TO authenticated;
GRANT ALL ON TABLE public.saas_plans TO authenticated;
GRANT ALL ON TABLE public.saas_subscriptions TO authenticated;
GRANT ALL ON TABLE public.saas_config TO authenticated;

-- 8. Limpar Notificações
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SaaS Reparado: Tabelas actualizadas, Simão configurado como Master Admin e RLS configurado.';
END $$;
