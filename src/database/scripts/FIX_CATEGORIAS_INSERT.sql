-- =============================================================
-- 🛠️ CORREÇÃO: NOVA CATEGORIA NÃO SALVA (pos_categorias)
-- Problema: A coluna pode ser empresa_id ou tenant_id e o código
--           usa tenant_id. As políticas RLS precisam ser ajustadas.
-- =============================================================

-- PASSO 1: Verificar qual coluna existe e garantir que tenant_id existe
DO $$
BEGIN
    -- Se existir empresa_id mas não tenant_id, renomear
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'pos_categorias' AND column_name = 'empresa_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'pos_categorias' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.pos_categorias RENAME COLUMN empresa_id TO tenant_id;
        RAISE NOTICE '✅ pos_categorias: empresa_id renomeada para tenant_id';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'pos_categorias' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.pos_categorias ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
        RAISE NOTICE '✅ pos_categorias: coluna tenant_id adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ pos_categorias: tenant_id já existe, nenhuma alteração necessária';
    END IF;
END $$;

-- PASSO 2: Garantir que tenant_id tem DEFAULT automático
ALTER TABLE public.pos_categorias 
    ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant();

-- PASSO 3: Limpar TODAS as políticas antigas da tabela
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'pos_categorias'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pos_categorias', pol.policyname);
        RAISE NOTICE 'Política removida: %', pol.policyname;
    END LOOP;
END $$;

-- PASSO 4: Desabilitar RLS temporariamente para garantir limpeza
ALTER TABLE public.pos_categorias DISABLE ROW LEVEL SECURITY;

-- PASSO 5: Recriar política unificada e correta
CREATE POLICY "RLS_POS_CATEGORIAS_TENANT_V2" ON public.pos_categorias
    FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_auth_tenant() 
        OR public.is_master_admin()
    )
    WITH CHECK (
        tenant_id = public.get_auth_tenant() 
        OR public.is_master_admin()
    );

-- PASSO 6: Reabilitar RLS
ALTER TABLE public.pos_categorias ENABLE ROW LEVEL SECURITY;

-- PASSO 7: Garantir permissões para utilizadores autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_categorias TO authenticated;

-- PASSO 8: Verificar estado
DO $$
DECLARE
    col_exists boolean;
    policy_count int;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'pos_categorias' AND column_name = 'tenant_id'
    ) INTO col_exists;

    SELECT COUNT(*) FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pos_categorias'
    INTO policy_count;

    RAISE NOTICE '=== ESTADO FINAL pos_categorias ===';
    RAISE NOTICE 'Coluna tenant_id existe: %', col_exists;
    RAISE NOTICE 'Número de políticas RLS: %', policy_count;
    RAISE NOTICE '✅ Correção concluída! Tente criar uma categoria novamente.';
END $$;

-- PASSO 9: Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';
