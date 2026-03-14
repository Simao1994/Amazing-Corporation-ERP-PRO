-- ==============================================================================
-- 🚀 REPARO TOTAL DE ESTABILIDADE E CONEXÃO (ULTIMATE FIX)
-- 1. Resolve Recursividade RLS (Fim do TIMEOUT)
-- 2. Unifica colunas para 'tenant_id' (Fim do erro de abertura de caixa)
-- 3. Otimiza performance de Admin
-- ==============================================================================

-- [PASSO 1] RECONTRUÇÃO DAS FUNÇÕES DE SEGURANÇA (NON-RECURSIVE)
-- Estas funções agora priorizam o JWT para evitar consultas à DB durante o RLS.

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- 1. Prioridade Máxima: JWT metadata (Zero latência, resolve recursão)
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;

  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;

  -- 2. Fallback: Consulta à DB (Apenas se o token estiver incompleto)
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_tenant_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Super-admin ID Bypass (Simão)
  IF auth.uid() = 'aee79bd9-edd2-4a36-8e4e-a1b5d0acd1d4' THEN RETURN TRUE; END IF;

  -- 2. JWT Role Check
  IF (auth.jwt() -> 'user_metadata' ->> 'role' = 'saas_admin') THEN RETURN TRUE; END IF;
  IF (auth.jwt() -> 'app_metadata' ->> 'role' = 'saas_admin') THEN RETURN TRUE; END IF;

  -- 3. DB Fallback
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'saas_admin'
  );
END;
$$;

-- Função auxiliar unificada
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$ BEGIN RETURN public.is_saas_admin(); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- [PASSO 2] UNIFICAÇÃO DE ESQUEMA (TENANT_ID)
-- Resolve o conflito entre empresa_id e tenant_id em todas as tabelas POS.

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
        -- Verificar se a tabela existe antes de mexer
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            
            -- Se empresa_id existir, renomeia para tenant_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'empresa_id') 
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I RENAME COLUMN empresa_id TO tenant_id', t_name);
                RAISE NOTICE 'Tabela %: empresa_id -> tenant_id.', t_name;
            END IF;

            -- Se tenant_id não existir (em tabelas novas), adiciona
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id)', t_name);
                RAISE NOTICE 'Tabela %: tenant_id adicionado.', t_name;
            END IF;

            -- Limpar Políticas Antigas
            EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_CAIXA_TENANT" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_CAIXA_ADMIN" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_TENANT_POLICY" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Isolamento por empresa_id para %I" ON public.%I', t_name, t_name);

            -- Aplicar Nova Política (Otimizada)
            EXECUTE format('
                CREATE POLICY "RLS_POS_TENANT_POLICY" ON public.%I
                FOR ALL TO authenticated
                USING (tenant_id = public.get_auth_tenant() OR public.is_master_admin())
                WITH CHECK (tenant_id = public.get_auth_tenant() OR public.is_master_admin());
            ', t_name);

            -- Activar RLS e definir default
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant()', t_name);
        END IF;
    END LOOP;
END $$;

-- [PASSO 3] REPARO DE PROFILES (Fim do loop de recursão infinito)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles accessibility" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON public.profiles;

CREATE POLICY "Profiles accessibility" ON public.profiles
FOR ALL TO authenticated
USING (
  id = auth.uid() 
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'saas_admin')
  OR
  (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid)
);

-- [PASSO 4] PERMISSÕES FINAIS
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_saas_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

-- Forçar recarregamento do PostgREST
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE '✅ SISTEMA ESTABILIZADO: Recursão resolvida e esquema unificado.'; END $$;
