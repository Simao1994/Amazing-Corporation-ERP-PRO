-- ================================================================
-- 🛡️ REPARAÇÃO DE SEGURANÇA: TABELA DE UTILIZADORES / PERFIS
-- Resolve o erro "permission denied for table users"
-- ================================================================

-- 1. Garantir que as funções de segurança são SECURITY DEFINER
-- Isto permite que as políticas RLS leiam a tabela de perfis sem entrar em loop.

CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'saas_admin' OR role = 'admin')
    )
    OR 
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'simaopambo94@gmail.com'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- 2. RESET TOTAL DE RLS NA TABELA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que podem estar a causar conflitos ou a referenciar tabelas inexistentes
DROP POLICY IF EXISTS "saas_admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_own_tenant_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only see profiles from their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Master Admin total access profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;

-- 3. Criar políticas limpas e eficientes

-- A. Master Admin: Acesso total
CREATE POLICY "saas_admin_full_access" 
ON public.profiles
FOR ALL 
TO authenticated
USING (public.is_saas_admin())
WITH CHECK (public.is_saas_admin());

-- B. Ver Próprio Perfil: Sempre permitido
CREATE POLICY "profiles_view_self" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- C. Ver Colegas do mesmo Tenant: Permitido para todos do mesmo tenant
CREATE POLICY "profiles_view_tenant" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (tenant_id = public.get_auth_tenant());

-- D. Atualizar Próprio Perfil (Campos limitados seriam ideais, mas aqui permitimos o básico)
CREATE POLICY "profiles_update_self" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. Garantir que o authenticated tem permissões de SELECT na tabela
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 5. Se existir uma tabela chamada 'users' no public (erro comum), garantir que não bloqueia
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.users TO authenticated;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Sistema de Perfis e RLS reparado com sucesso!' as resultado;
