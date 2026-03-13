-- ================================================================
-- 🛡️ SOLUÇÃO DEFINITIVA: PERMISSÕES MASTER & RLS PROFILES
-- Resolve o erro "permission denied for table users" e Loops RLS.
-- ================================================================

-- 1. Optimizar is_saas_admin para EVITAR busca na tabela auth.users (causa erro de permissão)
-- Usamos o email do JWT que é instantâneo e seguro.
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_email text;
BEGIN
    -- Obter email do JWT (sem query à tabela auth.users)
    v_email := auth.jwt() ->> 'email';
    
    -- Se for o email mestre, acesso total garantido
    IF v_email = 'simaopambo94@gmail.com' THEN
        RETURN true;
    END IF;

    -- Caso contrário, verificar role no perfil (usando SECURITY DEFINER para evitar recursion)
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN (v_role = 'saas_admin' OR v_role = 'admin');
END;
$$;

-- 2. Garantir que get_auth_tenant() é eficiente e SECURITY DEFINER
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

-- 3. RESET DE RLS NA TABELA PROFILES (Limpeza de resíduos)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas que possam referenciar 'users' ou causar loops
DROP POLICY IF EXISTS "saas_admin_full_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "Users can only see profiles from their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

-- 4. CRIAR POLÍTICAS NOVAS (ORDEM DE PRECEDÊNCIA)

-- A. MASTER ADMIN (Acesso total)
CREATE POLICY "profiles_master_all" 
ON public.profiles FOR ALL 
TO authenticated 
USING (public.is_saas_admin());

-- B. SELECT: O próprio ou colegas do mesmo tenant
CREATE POLICY "profiles_select_logic" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
    id = auth.uid() 
    OR 
    tenant_id = public.get_auth_tenant()
);

-- C. UPDATE: Apenas o próprio
CREATE POLICY "profiles_update_logic" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. TRATAR TABELA 'users' NO PUBLIC (Se existir por erro)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        EXECUTE 'ALTER TABLE public.users DISABLE ROW LEVEL SECURITY';
        EXECUTE 'GRANT SELECT ON public.users TO authenticated';
    END IF;
END $$;

-- 6. PERMISSÕES FINAIS
GRANT SELECT ON public.profiles TO authenticated;

-- Refresh do cache do PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '✅ Sistema de Segurança Master reparado com sucesso!' as status;
