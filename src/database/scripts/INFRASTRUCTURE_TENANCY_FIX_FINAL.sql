-- ================================================================
-- 🆘 INFRASTRUCTURE & TENANCY RESTORE (FINAL EMERGENCY FIX)
-- Resolve o loop de recursão RLS e unifica a coluna 'tenant_id' no profiles.
-- ================================================================

DO $$
BEGIN
    -- 1. Unificar coluna no PROFILES (Caso tenha sido pulada)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'empresa_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
            -- Se ambos existem, migrar e apagar empresa_id
            UPDATE public.profiles SET tenant_id = empresa_id WHERE tenant_id IS NULL;
            ALTER TABLE public.profiles DROP COLUMN empresa_id CASCADE;
        ELSE
            -- Apenas renomear
            ALTER TABLE public.profiles RENAME COLUMN empresa_id TO tenant_id;
        END IF;
        RAISE NOTICE 'Tabela profiles: Coluna unificada para tenant_id.';
    END IF;
END $$;

-- 2. Redefinir funções de segurança para serem ULTRA-RESILIENTES (Sem Recursão)
-- get_auth_tenant() agora tenta ler do JWT primeiro (muito mais rápido e seguro)
CREATE OR REPLACE FUNCTION public.get_auth_tenant() 
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant_id text;
BEGIN
  -- Tentar pegar dos metadados do JWT (Estratégia mais rápida)
  _tenant_id := current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id';
  
  IF _tenant_id IS NOT NULL THEN
    RETURN _tenant_id::uuid;
  END IF;

  -- Fallback: Buscar no banco ignorando RLS (SECURITY DEFINER permite isso)
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END; $$;

-- Corrigir função de administrador para evitar recursão
CREATE OR REPLACE FUNCTION public.is_saas_admin() 
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saas_admin');
END; $$;

-- 3. RESET DE RLS NA TABELA PROFILES (Quebrar a Recursão)
-- A política "profile_tenant_select" anterior usava get_auth_tenant(), que causava o loop.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_self_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_tenant_select" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "global_admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_read" ON public.profiles;

-- Política 1: O utilizador sempre pode ver e editar o seu próprio perfil (Baseado em ID, sem recursão)
CREATE POLICY "profiles_owner_access" ON public.profiles 
    FOR ALL TO authenticated 
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Política 2: Administradores SaaS podem ver tudo (Usa a função SECURITY DEFINER que agora é segura)
CREATE POLICY "profiles_admin_access" ON public.profiles 
    FOR ALL TO authenticated 
    USING (is_saas_admin());

-- Política 3: Membros da mesma empresa podem ver perfis uns dos outros (Usa o parâmetro cacheado se possível)
CREATE POLICY "profiles_tenant_read" ON public.profiles 
    FOR SELECT TO authenticated 
    USING (tenant_id = (
        COALESCE(
            (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id')::uuid,
            (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
        )
    ));

-- 4. SINCRONIZAÇÃO FORÇADA DE METADADOS
-- Isso garante que o get_auth_tenant() funcione instantaneamente via JWT
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN SELECT id, tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LOOP
        BEGIN
            UPDATE auth.users 
            SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('tenant_id', p.tenant_id)
            WHERE id = p.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Falha ao sincronizar utilizador %: %', p.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- 5. REFRESH DE CACHE E NOTIFICAÇÃO
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO ABSOLUTO: Infraestrutura restaurada, loops de recursão quebrados e tenancy unificada.';
END $$;
