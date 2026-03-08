-- ================================================================
-- 🛠️ REPARO DE PERFIS E METADADOS (SOLUÇÃO DE DESCONEXÃO)
-- Este script resolve falhas onde o tenant_id não é encontrado
-- e evita recursividade no RLS da tabela 'profiles'.
-- ================================================================

-- 1. Garantir que a tabela profiles tem RLS mas com política simples para o dono
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. Forçar a sincronização de todos os tenant_id para o metadados do Auth
-- Isso garante que get_auth_tenant() funcione via JWT sem bater no banco
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN SELECT id, tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LOOP
        UPDATE auth.users 
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('tenant_id', p.tenant_id)
        WHERE id = p.id;
        RAISE NOTICE 'Metadados sincronizados para o utilizador: %', p.id;
    END LOOP;
END $$;

-- 3. Caso o utilizador não tenha um tenant_id, vamos garantir que ele tenha um padrão
-- (Opcional: Descomente se quiser atribuir um tenant padrão para órfãos)
-- UPDATE public.profiles SET tenant_id = 'ID_DA_SUA_EMPRESA_AQUI' WHERE tenant_id IS NULL;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ REPARO CONCLUÍDO: Metadados sincronizados e RLS de perfis corrigido.';
END $$;
