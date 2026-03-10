-- ==============================================================================
-- 🛠️ SOLUÇÃO DEFINITIVA PARA RECURSIVIDADE DE RLS (TABELA PROFILES)
-- PROBLEMA: "infinite recursion detected in policy for relation profiles"
-- CAUSA: Políticas que fazem subqueries na própria tabela sem SECURITY DEFINER.
-- ==============================================================================

-- 1. Redefinir a função auxiliar com SECURITY DEFINER (Crucial para evitar recursão)
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- 1. Check por ID estático do Super Admin (Simão)
    IF auth.uid() = 'aee79bd9-edd2-4a36-8e4e-a1b5d0acd1d4' THEN
        RETURN TRUE;
    END IF;

    -- 2. Check por role na base de dados
    -- O SECURITY DEFINER garante que esta query ignora o RLS, parando a recursão.
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    RETURN COALESCE(v_role = 'saas_admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Garantir RLS activo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Limpar todas as políticas antigas e conflituosas
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_master_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile strict" ON public.profiles;
DROP POLICY IF EXISTS "Master Admin Read All Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Master Admin Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Auto-Leitura de Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Auto-Edição de Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile strict" ON public.profiles;
DROP POLICY IF EXISTS "Master Admin Read All Profiles" ON public.profiles;

-- 4. Criar novas políticas seguras e optimizadas

-- SELECT: Utilizador pode ver o seu perfil OU Master Admin vê tudo
CREATE POLICY "profiles_select_policy" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
    auth.uid() = id 
    OR 
    is_master_admin()
);

-- UPDATE: Utilizador pode editar o seu perfil (campos permitidos)
-- NOTA: Restrições de role/tenant_id devem ser feitas na App ou via Trigger
CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- MASTER ADMIN: Acesso total (Insert/Delete/Update de outros)
CREATE POLICY "profiles_master_admin_all" 
ON public.profiles FOR ALL 
TO authenticated 
USING (is_master_admin());

-- 5. Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ RLS de PROFILES corrigido com sucesso! A recursividade foi eliminada.';
END $$;
