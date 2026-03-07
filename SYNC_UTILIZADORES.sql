-- ================================================================
-- 🔄 SYNC DE UTILIZADORES: AUTH -> PROFILES
-- Este script garante que todos os utilizadores no Supabase Auth 
-- existam também na tabela de Perfis do ERP.
-- ================================================================

DO $$
DECLARE
    user_record RECORD;
    root_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
    total_sync INT := 0;
BEGIN
    -- Loop por todos os utilizadores que existem no Auth mas não no Profiles
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        -- Inserir o perfil em falta
        -- Definimos a role baseada no email (Simão é saas_admin, os outros operário por padrão)
        INSERT INTO public.profiles (id, email, nome, role, tenant_id, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'nome', split_part(user_record.email, '@', 1)),
            CASE 
                WHEN user_record.email = 'simaopambo94@gmail.com' THEN 'saas_admin'
                ELSE 'operario'
            END,
            root_tenant_id, -- Todos ficam no tenant root por agora, para serem visíveis
            NOW(),
            NOW()
        );
        total_sync := total_sync + 1;
    END LOOP;

    RAISE NOTICE 'Sincronização concluída: % novos perfis criados.', total_sync;
END $$;

-- Garantir que as permissões de visibilidade estão corretas
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
CREATE POLICY "Admins podem ver todos os perfis" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true); -- Permitimos que todos os logados se vejam uns aos outros por agora

-- Garantir acesso total ao Master Admin na tabela de perfis
DROP POLICY IF EXISTS "Master Admin total access profiles" ON public.profiles;
CREATE POLICY "Master Admin total access profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (is_master_admin());
