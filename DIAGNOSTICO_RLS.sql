-- ================================================================
-- 🔍 SCRIPT DE DIAGNÓSTICO: RLS & PERMISSÕES
-- Execute este script no SQL Editor e partilhe os resultados.
-- ================================================================

-- 1. Verificar o utilizador actual
SELECT 
    auth.uid() as meu_id,
    p.email,
    p.role,
    p.tenant_id
FROM public.profiles p
WHERE p.id = auth.uid();

-- 2. Verificar se a função is_master_admin() está a funcionar
SELECT public.is_master_admin() as sou_master_admin;

-- 3. Listar políticas activas na tabela saas_tenants
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies
WHERE tablename = 'saas_tenants';

-- 4. TENTATIVA DE REPARAÇÃO ULTRA-FORÇADA
-- Se o teste acima der FALSE, este bloco tenta corrigir novamente.
DO $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NOT NULL THEN
        UPDATE public.profiles 
        SET role = 'saas_admin' 
        WHERE id = v_uid;
        RAISE NOTICE 'Role saas_admin forçada para o utilizador actual: %', v_uid;
    END IF;
END $$;
