-- ==============================================================================
-- 🚀 REPARO TOTAL DE RLS POS: UNIFICAÇÃO PARA TENANT_ID
-- Resolve o erro de visibilidade e possíveis conflitos de colunas.
-- ==============================================================================

-- 1. Redefinir get_auth_tenant() para ser SECURITY DEFINER 
-- Isso evita qualquer problema de recursão ao consultar o perfil.
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Lista de tabelas POS para unificar RLS
DO $$
DECLARE
    t_name text;
    tables_pos text[] := ARRAY[
        'pos_caixa', 
        'pos_categorias', 
        'pos_produtos', 
        'pos_estoque', 
        'pos_faturas', 
        'pos_fatura_itens', 
        'pos_movimentos_caixa', 
        'pos_fechamento_caixa',
        'pos_movimento_stock'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_pos LOOP
        -- a. Garantir que as tabelas têm a coluna tenant_id
        -- Se empresa_id existir, renomeia. Se nenhuma existir, adiciona.
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'tenant_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'empresa_id') THEN
                EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empresa_id TO tenant_id', t_name);
                RAISE NOTICE 'Tabela %: empresa_id renomeada para tenant_id.', t_name;
            ELSE
                -- Caso especial: a tabela pode não ter nenhuma das duas (ex: pos_fatura_itens original)
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id)', t_name);
                RAISE NOTICE 'Tabela %: coluna tenant_id adicionada.', t_name;
                
                -- Se for a tabela de itens, preencher a partir da fatura pai
                IF t_name = 'pos_fatura_itens' THEN
                    EXECUTE 'UPDATE public.pos_fatura_itens i SET tenant_id = f.tenant_id FROM public.pos_faturas f WHERE i.fatura_id = f.id';
                END IF;
            END IF;
        END IF;

        -- b. Limpar políticas obsoletas
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_CAIXA_TENANT" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_CAIXA_ADMIN" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_CATEGORIAS_TENANT" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_PRODUTOS_TENANT" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_FATURAS_TENANT" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Isolamento por empresa_id para %I" ON public.%I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Master Admin bypass" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Isolamento via fatura pai para pos_fatura_itens" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation via fatura pai" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_TENANT_POLICY" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_ITEMS_TENANT" ON public.%I', t_name);

        -- c. Aplicar nova política unificada
        -- Se a coluna tenant_id existe agora (que garantimos acima), podemos criar a política
        EXECUTE format('
            CREATE POLICY "RLS_POS_TENANT_POLICY" ON public.%I
            FOR ALL TO authenticated
            USING (tenant_id = public.get_auth_tenant() OR public.is_master_admin())
            WITH CHECK (tenant_id = public.get_auth_tenant() OR public.is_master_admin());
        ', t_name);

        -- d. Habilitar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        
        -- e. Garantir default automático
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', t_name);
        
    END LOOP;
END $$;

-- 3. Garantir que o tenant_id do Simão está correto (para que o get_auth_tenant funcione)
UPDATE public.profiles 
SET tenant_id = '00000000-0000-0000-0000-000000000000' 
WHERE email = 'simaopambo94@gmail.com' AND tenant_id IS NULL;

-- 4. Notificar alterações
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ MÓDULO POS: RLS Unificado e colunas padronizadas para tenant_id.';
END $$;
