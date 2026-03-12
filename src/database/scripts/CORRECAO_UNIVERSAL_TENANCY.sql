-- ================================================================
-- 🛠️ CORREÇÃO UNIVERSAL DE RLS E TENANCY
-- Padroniza tenant_id e garante políticas corretas em todos os módulos.
-- ================================================================

DO $$
DECLARE
    tbl_record RECORD;
BEGIN
    -- 1. Unificar empresa_id -> tenant_id em tabelas POS (se existirem)
    FOR tbl_record IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'empresa_id' 
        AND table_schema = 'public'
        AND table_name LIKE 'pos_%'
    LOOP
        -- Renomear se tenant_id não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_record.table_name AND column_name = 'tenant_id' AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empresa_id TO tenant_id', tbl_record.table_name);
            RAISE NOTICE 'Tabela %: empresa_id renomeada para tenant_id.', tbl_record.table_name;
        ELSE
            -- Migrar e remover
            EXECUTE format('UPDATE public.%I SET tenant_id = empresa_id WHERE tenant_id IS NULL AND empresa_id IS NOT NULL', tbl_record.table_name);
            EXECUTE format('ALTER TABLE public.%I DROP COLUMN empresa_id CASCADE', tbl_record.table_name);
            RAISE NOTICE 'Tabela %: empresa_id migrada e removida.', tbl_record.table_name;
        END IF;
    END LOOP;
END $$;

-- 2. Limpeza de políticas POS que usam empresa_id
DROP POLICY IF EXISTS "RLS_POS_CAIXA_TENANT" ON public.pos_caixa;
DROP POLICY IF EXISTS "RLS_POS_CATEGORIAS_TENANT" ON public.pos_categorias;
DROP POLICY IF EXISTS "RLS_POS_PRODUTOS_TENANT" ON public.pos_produtos;
DROP POLICY IF EXISTS "RLS_POS_FATURAS_TENANT" ON public.pos_faturas;
DROP POLICY IF EXISTS "Isolamento por empresa_id para pos_categorias" ON public.pos_categorias;
DROP POLICY IF EXISTS "Isolamento por empresa_id para pos_produtos" ON public.pos_produtos;

-- 3. Criar Políticas Unificadas com tenant_id
DO $$
DECLARE
    tbl_record RECORD;
BEGIN
    FOR tbl_record IN 
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
        AND table_name NOT IN ('saas_tenants', 'profiles', 'saas_subscriptions', 'saas_plans')
    LOOP
        -- Garantir RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_record.table_name);
        
        -- Remover qualquer política de isolamento anterior
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', tbl_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation policy" ON public.%I', tbl_record.table_name);
        
        -- Criar nova política
        EXECUTE format('CREATE POLICY "Tenant isolation" ON public.%I FOR ALL USING (tenant_id = public.get_auth_tenant())', tbl_record.table_name);
        
        -- Default automático
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', tbl_record.table_name);
    END LOOP;
END $$;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
