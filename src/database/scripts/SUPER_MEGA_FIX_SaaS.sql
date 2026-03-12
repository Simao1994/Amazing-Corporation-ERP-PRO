-- ================================================================
-- 🚀 MEGA-FIX FINAL: INFRAESTRUTURA SaaS & MASTER ADMIN
-- Execute este script INTEGRALMENTE no SQL Editor do Supabase.
-- ================================================================

-- 1. LIMPEZA DE POLÍTICAS ANTIGAS (Garante que começamos do zero)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Perfis são visíveis por todos para RLS" ON public.profiles;
DROP POLICY IF EXISTS "Master Admin total access plans" ON public.saas_plans;
DROP POLICY IF EXISTS "Master Admin total access tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Master Admin total access subscriptions" ON public.saas_subscriptions;

-- 2. FUNÇÃO DE VERIFICAÇÃO MASTER ADMIN (A "Chave Mestra")
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

-- 3. POLÍTICAS DE ACESSO (Onde o Master Admin ganha super-poderes)

-- Habilitar RLS em tudo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- Permite que o Supabase verifique os perfis para a função is_master_admin()
CREATE POLICY "RLS: Profiles are readable" ON public.profiles FOR SELECT USING (true);

-- Acesso Total para Master Admin nas tabelas SaaS
CREATE POLICY "Master Admin Planos" ON public.saas_plans FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Empresas" ON public.saas_tenants FOR ALL TO authenticated USING (is_master_admin());
CREATE POLICY "Master Admin Subscrições" ON public.saas_subscriptions FOR ALL TO authenticated USING (is_master_admin());

-- 4. CRIAÇÃO DO UTILITÁRIO ROOT (Onde resolvemos o erro do Tenant Nulo)
DO $$
DECLARE
    user_id UUID;
    root_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Procurar o ID do Simão
    SELECT id INTO user_id FROM auth.users WHERE email = 'simaopambo94@gmail.com' LIMIT 1;

    IF user_id IS NULL THEN
        RAISE NOTICE '⚠️ AVISO: Email simaopambo94@gmail.com não encontrado. Use o email correto!';
    ELSE
        -- Criar Empresa Raiz (Obrigatória para o perfil)
        INSERT INTO public.saas_tenants (id, nome, slug, status, created_at)
        VALUES (root_tenant_id, 'Amazing Cloud Root', 'amazing-cloud-root', 'ativo', NOW())
        ON CONFLICT (id) DO NOTHING;

        -- Criar Perfil de Simão como Master Admin
        INSERT INTO public.profiles (id, email, role, nome, tenant_id, updated_at, created_at)
        VALUES (user_id, 'simaopambo94@gmail.com', 'saas_admin', 'Simão Pambo Master', root_tenant_id, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'saas_admin', tenant_id = root_tenant_id, updated_at = NOW();

        RAISE NOTICE '✅ SUCESSO: Simão (% ) agora é MASTER ADMIN!', user_id;
    END IF;
END $$;
