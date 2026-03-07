-- ================================================================
-- 🏢 SUPREME FIX: VISIBILIDADE DE EMPRESAS (VERSION 2)
-- Este script força a visibilidade e resolve o problema do Master Admin.
-- ================================================================

-- 1. Identificar o ID do Tenant Raiz (Default)
DO $$
DECLARE
    v_root_tenant_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Garantir que o tenant raiz existe
    INSERT INTO public.saas_tenants (id, nome, slug, status)
    VALUES (v_root_tenant_id, 'Amazing Cloud Root', 'amazing-cloud-root', 'ativo')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Backfill forçado: Associar empresas sem tenant_id ao Root
    -- Isto garante que elas NÃO fiquem escondidas por políticas restritivas.
    UPDATE public.empresas SET tenant_id = v_root_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.acc_empresas SET tenant_id = v_root_tenant_id WHERE tenant_id IS NULL;
    
    RAISE NOTICE '✅ Dados órfãos associados ao Tenant Raiz.';
END $$;

-- 2. Reset de Políticas (Limpeza Total)
DROP POLICY IF EXISTS "Master Admin total access" ON public.empresas;
DROP POLICY IF EXISTS "Tenants isolation" ON public.empresas;
DROP POLICY IF EXISTS "Tenants isolation acc" ON public.acc_empresas;
DROP POLICY IF EXISTS "Master Admin acc total" ON public.acc_empresas;
DROP POLICY IF EXISTS "Master Admin can see all units" ON public.empresas;

-- 3. Novas Políticas Super-Resilientes para public.empresas
-- A: Master Admin pode ver e fazer TUDO em QUALQUER empresa
CREATE POLICY "Master Admin Bypass" 
ON public.empresas FOR ALL 
TO authenticated 
USING (public.is_master_admin())
WITH CHECK (true);

-- B: Utilizadores Comuns vêem apenas a sua própria empresa (Tenants)
CREATE POLICY "Tenant Isolation" 
ON public.empresas FOR ALL 
TO authenticated 
USING (tenant_id = public.get_auth_tenant())
WITH CHECK (tenant_id = public.get_auth_tenant());

-- 4. Repetir para public.acc_empresas (Contabilidade)
CREATE POLICY "Master Admin Bypass Acc" 
ON public.acc_empresas FOR ALL 
TO authenticated 
USING (public.is_master_admin())
WITH CHECK (true);

CREATE POLICY "Tenant Isolation Acc" 
ON public.acc_empresas FOR ALL 
TO authenticated 
USING (tenant_id = public.get_auth_tenant())
WITH CHECK (tenant_id = public.get_auth_tenant());

-- 5. Configurar Defaults Automáticos
ALTER TABLE public.empresas ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'; -- Default Seguro
ALTER TABLE public.acc_empresas ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- 6. Forçar sincronização de metadados para o Simão (Garante que o is_master_admin() não falha)
DO $$
BEGIN
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || '{"role": "saas_admin", "is_master": true}'::jsonb
    WHERE email = 'simaopambo94@gmail.com';
END $$;

-- Sincronizar schema
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ FIX SUPREMO V2 APLICADO: Visibilidade total restaurada para Master Admin.';
END $$;
