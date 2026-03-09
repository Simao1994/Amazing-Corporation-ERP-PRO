-- ================================================================
-- 🏁 SOLUÇÃO DEFINITIVA: MASTER ADMIN & SaaS RLS FIX
-- Este script resolve o erro "violates row-level security policy"
-- ao cadastrar empresas ou gerir planos no Master Admin.
-- ================================================================

-- 1. FUNÇÃO DE VERIFICAÇÃO (CHAVE MESTRA)
-- Security Definer garante que a função ignore o RLS da tabela de perfis ao verificar a role.
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'saas_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RESET TOTAL E RE-HABILITAÇÃO DE RLS
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. LIMPEZA DE POLÍTICAS CONFLITUOSAS
DROP POLICY IF EXISTS "Master Admin Empresas" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Select Tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Insert Tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Update Tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Delete Tenants" ON public.saas_tenants;

DROP POLICY IF EXISTS "Master Admin Planos" ON public.saas_plans;
DROP POLICY IF EXISTS "Admin Access Plans" ON public.saas_plans;

DROP POLICY IF EXISTS "Master Admin Subscrições" ON public.saas_subscriptions;
DROP POLICY IF EXISTS "Admin Access Subs" ON public.saas_subscriptions;

-- 4. APLICAÇÃO DE POLÍTICAS ESTRUTURAIS (FOR ALL)
-- Usamos FOR ALL para garantir que SELECT, INSERT, UPDATE e DELETE funcionem num único comando.

-- Saas Tenants
DROP POLICY IF EXISTS "Master Admin Tenants Access" ON public.saas_tenants;
CREATE POLICY "Master Admin Tenants Access" 
ON public.saas_tenants 
FOR ALL 
TO authenticated 
USING (is_master_admin()) 
WITH CHECK (is_master_admin());

-- Saas Plans
DROP POLICY IF EXISTS "Master Admin Plans Access" ON public.saas_plans;
CREATE POLICY "Master Admin Plans Access" 
ON public.saas_plans 
FOR ALL 
TO authenticated 
USING (is_master_admin()) 
WITH CHECK (is_master_admin());

-- Saas Subscriptions
DROP POLICY IF EXISTS "Master Admin Subs Access" ON public.saas_subscriptions;
CREATE POLICY "Master Admin Subs Access" 
ON public.saas_subscriptions 
FOR ALL 
TO authenticated 
USING (is_master_admin()) 
WITH CHECK (is_master_admin());

-- 5. SINCRONIZAÇÃO E REFORÇO DO PERFIL (SIMÃO)
-- Garante que o email principal tenha sempre a role saas_admin
DO $$
DECLARE
    user_id UUID;
    root_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Procurar o ID do Simão no Auth
    SELECT id INTO user_id FROM auth.users WHERE email = 'simaopambo94@gmail.com' LIMIT 1;

    IF user_id IS NOT NULL THEN
        -- Criar Empresa Raiz se não existir
        INSERT INTO public.saas_tenants (id, nome, slug, status)
        VALUES (root_tenant_id, 'Amazing Cloud Root', 'amazing-cloud-root', 'ativo')
        ON CONFLICT (id) DO NOTHING;

        -- Forçar a ROLE no perfil
        INSERT INTO public.profiles (id, email, role, nome, tenant_id, updated_at, created_at)
        VALUES (user_id, 'simaopambo94@gmail.com', 'saas_admin', 'Simao Pambo Master', root_tenant_id, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'saas_admin', tenant_id = root_tenant_id, updated_at = NOW();
        
        RAISE NOTICE '✅ Master Admin configurado correctamente para: %', user_id;
    ELSE
        RAISE NOTICE '⚠️ Email simaopambo94@gmail.com não encontrado. Verifique os utilizadores no Auth.';
    END IF;
END $$;
