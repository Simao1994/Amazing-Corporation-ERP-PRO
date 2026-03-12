-- ================================================================
-- 🎯 VINCULAR UTILIZADOR À AMAZING CORPORATION
-- Este script associa o utilizador 'simaopambo94@gmail.com' à empresa correta.
-- ================================================================

DO $$
DECLARE
    target_tenant_id uuid;
    target_user_id uuid;
BEGIN
    -- 1. Encontrar o ID da empresa 'Amazing Corporation'
    SELECT id INTO target_tenant_id FROM public.saas_tenants 
    WHERE nome ILIKE '%Amazing Corporation%' OR slug = 'amazing-corp' 
    LIMIT 1;

    -- 2. Encontrar o ID do utilizador pelo email
    SELECT id INTO target_user_id FROM auth.users 
    WHERE email = 'simaopambo94@gmail.com' 
    LIMIT 1;

    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Empresa "Amazing Corporation" não encontrada na tabela saas_tenants.';
    END IF;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilizador "simaopambo94@gmail.com" não encontrado na tabela auth.users.';
    END IF;

    -- 3. Atualizar o perfil público
    UPDATE public.profiles 
    SET tenant_id = target_tenant_id 
    WHERE id = target_user_id;
    
    RAISE NOTICE 'Perfil atualizado com tenant_id: %', target_tenant_id;

    -- 4. Sincronizar metadados do Auth (Para performance e RLS instantâneo)
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('tenant_id', target_tenant_id)
    WHERE id = target_user_id;

    RAISE NOTICE 'Metadados de autenticação sincronizados.';

END $$;

-- 5. Recarregar esquema para garantir que o PostgREST vê as mudanças
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO: O utilizador simaopambo94@gmail.com agora está vinculado à Amazing Corporation.';
END $$;
