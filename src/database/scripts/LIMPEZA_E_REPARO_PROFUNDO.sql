-- ==============================================================================
-- 🧹 LIMPEZA E REPARO PROFUNDO DA BASE DE DADOS (MAX STABILITY)
-- 1. Resolve Recursividade RLS (Causa do Travamento)
-- 2. Unifica Esquema POS (Fix Terminal de Vendas)
-- 3. Manutenção de Performance (VACUUM & ANALYZE)
-- 4. Limpeza de Logs Obsoletos (Se existirem)
-- ==============================================================================

-- [PASSO 1] REPARO DE SEGURANÇA (O MAIS IMPORTANTE)
-- Remove o loop infinito que impede a conexão de ser rápida.

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tenant_id uuid;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_tenant_id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = 'aee79bd9-edd2-4a36-8e4e-a1b5d0acd1d4' THEN RETURN TRUE; END IF;
  IF (auth.jwt() -> 'user_metadata' ->> 'role' = 'saas_admin') THEN RETURN TRUE; END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'saas_admin');
END;
$$;

-- [PASSO 2] UNIFICAÇÃO DE TABELAS POS
DO $$
DECLARE
    t_name text;
    tables_pos text[] := ARRAY[
        'pos_caixa', 'pos_categorias', 'pos_produtos', 'pos_estoque', 
        'pos_faturas', 'pos_fatura_itens', 'pos_movimentos_caixa', 
        'pos_fechamento_caixa', 'pos_movimento_stock'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_pos LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            -- Renomear empresa_id se necessário
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'empresa_id') 
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empresa_id TO tenant_id', t_name);
            END IF;
            
            -- Aplicar Política Unificada sem Recursão
            EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_TENANT_POLICY" ON public.%I', t_name);
            EXECUTE format('
                CREATE POLICY "RLS_POS_TENANT_POLICY" ON public.%I
                FOR ALL TO authenticated
                USING (tenant_id = public.get_auth_tenant() OR public.is_master_admin())
                WITH CHECK (tenant_id = public.get_auth_tenant() OR public.is_master_admin());
            ', t_name);
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        END IF;
    END LOOP;
END $$;

-- [PASSO 3] LIMPEZA PROFUNDA E MANUTENÇÃO
-- Estes comandos libertam espaço e reorganizam a base de dados para ser mais rápida.

-- Limpeza de logs de Auditoria se forem muito antigos (ajuste o valor se necessário)
-- NOTA: Se a tabela audit_log não existir, o erro será ignorado.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
        DELETE FROM public.audit_log WHERE created_at < NOW() - INTERVAL '3 months';
        RAISE NOTICE 'Limpeza de logs de auditoria concluída (mantido apenas últimos 3 meses).';
    END IF;
END $$;

-- ANALYZE: Actualiza estatísticas para o optimizador de consultas
ANALYZE public.profiles;
ANALYZE public.pos_produtos;
ANALYZE public.pos_faturas;
ANALYZE public.pos_caixa;

-- VACUUM: Limpeza de espaço e optimização
-- Nota: 'VACUUM FULL' bloqueia as tabelas, por isso usamos apenas 'VACUUM' para não parar o sistema.
VACUUM public.profiles;
VACUUM public.pos_produtos;
VACUUM public.pos_faturas;

-- [PASSO 4] REFRESH GERAL
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE '✅ LIMPEZA E REPARO CONCLUÍDOS: O sistema agora deve estar leve e conectável.'; END $$;
