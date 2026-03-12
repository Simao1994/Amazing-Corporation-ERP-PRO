-- ================================================================
-- 🚀 UNIFICAÇÃO DE MULTI-TENANCY: EMPRESA_ID -> TENANT_ID (Versão Ultra-Resiliente)
-- Este script padroniza todas as tabelas base para usar 'tenant_id'.
-- Ele ignora views automaticamente e lida com dependências via CASCADE.
-- ================================================================

DO $$
DECLARE
    tbl_record RECORD;
    has_tenant_id boolean;
BEGIN
    -- 1. Unificar colunas de tenancy APENAS em tabelas base (BASE TABLE)
    -- Ignoramos views para evitar erros de existência pós-CASCADE.
    FOR tbl_record IN 
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.column_name = 'empresa_id' 
        AND c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
    LOOP
        -- Verificação de segurança: a tabela ainda existe? (Pode ter sido afetada por CASCADE anterior)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_record.table_name AND table_schema = 'public') THEN
            
            -- Verificar se 'tenant_id' já existe nessa tabela
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = tbl_record.table_name 
                AND column_name = 'tenant_id' 
                AND table_schema = 'public'
            ) INTO has_tenant_id;

            IF has_tenant_id THEN
                -- Se ambos existem, migrar dados de empresa_id para tenant_id
                EXECUTE format('UPDATE public.%I SET tenant_id = empresa_id WHERE tenant_id IS NULL AND empresa_id IS NOT NULL', tbl_record.table_name);
                
                -- Remover a coluna legada empresa_id com CASCADE
                -- Isso removerá views dependentes (elas precisarão ser recriadas se necessário)
                EXECUTE format('ALTER TABLE public.%I DROP COLUMN empresa_id CASCADE', tbl_record.table_name);
                RAISE NOTICE 'Tabela %: empresa_id removida (CASCADE).', tbl_record.table_name;
            ELSE
                -- Se apenas empresa_id existe, renomear.
                EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empresa_id TO tenant_id', tbl_record.table_name);
                RAISE NOTICE 'Tabela %: Coluna renomeada para tenant_id.', tbl_record.table_name;
            END IF;

        END IF;
    END LOOP;
END $$;

-- 2. Atualizar Políticas de RLS e Defaults de forma dinâmica
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
        -- Apenas se for uma tabela base
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_record.table_name AND table_type = 'BASE TABLE') THEN
            BEGIN
                -- Garantir que RLS está activo
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_record.table_name);
                
                -- Remover políticas antigas de todos os tipos possíveis
                EXECUTE format('DROP POLICY IF EXISTS "Isolamento por empresa_id para %I" ON public.%I', tbl_record.table_name, tbl_record.table_name);
                EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', tbl_record.table_name);
                EXECUTE format('DROP POLICY IF EXISTS "Isolamento multi-empresa" ON public.%I', tbl_record.table_name);
                
                -- Criar a nova política padrão unificada
                EXECUTE format('CREATE POLICY "Tenant isolation" ON public.%I FOR ALL USING (tenant_id = public.get_auth_tenant())', tbl_record.table_name);
                
                -- Aplicar o default automático do get_auth_tenant()
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', tbl_record.table_name);
                
                RAISE NOTICE 'RLS e Default aplicados à tabela: %', tbl_record.table_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Não foi possível aplicar RLS à tabela %. Erro: %', tbl_record.table_name, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- 3. Caso especial para itens de fatura
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_fatura_itens' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Isolamento via fatura pai para pos_fatura_itens" ON public.pos_fatura_itens;
        DROP POLICY IF EXISTS "Tenant isolation via fatura pai" ON public.pos_fatura_itens;
        
        CREATE POLICY "Tenant isolation via fatura pai" ON public.pos_fatura_itens
            FOR ALL
            USING (
                fatura_id IN (
                    SELECT id FROM public.pos_faturas WHERE tenant_id = public.get_auth_tenant()
                )
            );
        RAISE NOTICE 'Política especial de itens de fatura atualizada.';
    END IF;
END $$;

-- Notificar o PostgREST
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO: Todas as tabelas base foram convertidas para tenant_id.';
END $$;
