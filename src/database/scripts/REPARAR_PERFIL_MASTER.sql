-- ==============================================================================
-- 🚀 REPARAÇÃO DE PERFIL MASTER: VINCULAÇÃO E CRIAÇÃO
-- Execute este script no SQL Editor do Supabase.
-- Resolve: Categorias não carregam, Tabelas vazias, RLS Violation.
-- ==============================================================================

DO $$
DECLARE
    target_tenant_id uuid;
    target_user_id uuid;
BEGIN
    -- 1. Encontrar o ID da empresa 'Amazing Corporation' (Primeira encontrada)
    SELECT id INTO target_tenant_id FROM public.saas_tenants 
    WHERE nome ILIKE '%Amazing Corporation%' OR slug = 'amazing-corp' 
    ORDER BY created_at ASC
    LIMIT 1;

    -- 2. Encontrar o ID do utilizador pelo email (pode estar em auth.users mas não em profiles)
    SELECT id INTO target_user_id FROM auth.users 
    WHERE email = 'simaopambo94@gmail.com' 
    LIMIT 1;

    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Erro: Nenhuma empresa "Amazing Corporation" encontrada.';
    END IF;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Erro: O utilizador "simaopambo94@gmail.com" não existe no Supabase Auth.';
    END IF;

    -- 3. Garantir que o perfil existe ou Criar se não existir (UPSERT)
    INSERT INTO public.profiles (id, email, tenant_id, role, nome)
    VALUES (target_user_id, 'simaopambo94@gmail.com', target_tenant_id, 'saas_admin', 'Simão Pambo')
    ON CONFLICT (id) DO UPDATE 
    SET tenant_id = EXCLUDED.tenant_id,
        role = 'saas_admin',
        email = 'simaopambo94@gmail.com';
    
    RAISE NOTICE '✅ Perfil sincronizado com tenant_id: %', target_tenant_id;

    -- 4. Sincronizar metadados do Auth (Critical para RLS via JWT)
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || 
        jsonb_build_object('tenant_id', target_tenant_id, 'role', 'saas_admin')
    WHERE id = target_user_id;

    RAISE NOTICE '✅ Metadados de autenticação (JWT) atualizados.';

END $$;

NOTIFY pgrst, 'reload schema';

SELECT '✅ SUCESSO! O seu perfil foi reparado. Agora faça LOGOUT e LOGIN novamente no sistema para ativar as mudanças.' as resultado;
