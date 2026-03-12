-- ================================================================
-- 🛡️ REPARAÇÃO GLOBAL: DEFAULT TENANT_ID
-- Este script garante que todos os novos registos recebam o tenant_id
-- automaticamente do perfil do utilizador logado, mesmo que o 
-- frontend esqueça de enviar o campo.
-- ================================================================

-- 1. Função para capturar o tenant_id do utilizador actual (alinhada com migrações)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Script Dinâmico para aplicar o DEFAULT em todas as tabelas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
        AND table_name NOT IN ('saas_tenants', 'saas_plans', 'saas_subscriptions', 'profiles')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', r.table_name);
        RAISE NOTICE 'Aplicado DEFAULT tenant_id na tabela: %', r.table_name;
    END LOOP;
END $$;

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO: Todas as tabelas agora auto-atribuem o tenant_id.';
END $$;
