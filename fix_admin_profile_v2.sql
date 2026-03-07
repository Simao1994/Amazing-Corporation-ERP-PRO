-- ==========================================
-- CORREÇÃO CRÍTICA V2: PERFIL ADMINISTRADOR + TENANT ROOT
-- ==========================================

DO $$
DECLARE
    user_id UUID;
    root_tenant_id UUID := '00000000-0000-0000-0000-000000000000'; -- ID Fixo para o Tenant Master
BEGIN
    -- 1. Obter o ID do utilizador pelo email
    SELECT id INTO user_id FROM auth.users WHERE email = 'simaopambo94@gmail.com' LIMIT 1;

    IF user_id IS NULL THEN
        RAISE NOTICE 'Utilizador simaopambo94@gmail.com não encontrado no Auth.';
    ELSE
        -- 2. Garantir que existe um "Tenant Root" para o Master Admin (evita erro de constraint)
        INSERT INTO public.saas_tenants (id, nome, slug, status, created_at)
        VALUES (root_tenant_id, 'Amazing Cloud Root', 'amazing-cloud-root', 'ativo', NOW())
        ON CONFLICT (id) DO NOTHING;

        -- 3. Inserir ou Atualizar o perfil com a role saas_admin e o tenant_id obrigatório
        INSERT INTO public.profiles (id, email, role, nome, tenant_id, updated_at, created_at)
        VALUES (
            user_id, 
            'simaopambo94@gmail.com', 
            'saas_admin', 
            'Simão Pambo Master', 
            root_tenant_id,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET 
            role = 'saas_admin', 
            tenant_id = root_tenant_id,
            updated_at = NOW();
        
        RAISE NOTICE 'Perfil saas_admin e Tenant Root configurados para: %', user_id;
    END IF;
END $$;
