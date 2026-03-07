-- ================================================================
-- 🏢 CORREÇÃO DE VISIBILIDADE: UNIDADES DO GRUPO (EMPRESAS)
-- Este script garante que a tabela 'empresas' funcione no modo multi-empresa
-- e que os novos registos não desapareçam.
-- ================================================================

-- 1. Garantir que o default do tenant_id está configurado (caso tenha falhado antes)
ALTER TABLE public.empresas ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant();

-- 2. Habilitar RLS (caso não esteja)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas obsoletas
DROP POLICY IF EXISTS "Multi-tenant isolation" ON public.empresas;
DROP POLICY IF EXISTS "Tenants can only see their own units" ON public.empresas;
DROP POLICY IF EXISTS "Master Admin can see all units" ON public.empresas;

-- 4. Política para Master Admin (Acesso Total)
CREATE POLICY "Master Admin total access" 
ON public.empresas FOR ALL 
TO authenticated 
USING (public.is_master_admin());

-- 5. Política para Utilizadores do mesmo Tenant (Isolamento Multi-Empresa)
CREATE POLICY "Tenants isolation" 
ON public.empresas FOR ALL 
TO authenticated 
USING (tenant_id = public.get_auth_tenant())
WITH CHECK (tenant_id = public.get_auth_tenant());

-- 6. Reparar dados órfãos (se existirem empresas sem tenant_id, associar ao tenant do administrador atual)
-- Isso evita que empresas cadastradas antes do fix fiquem escondidas.
UPDATE public.empresas 
SET tenant_id = public.get_auth_tenant() 
WHERE tenant_id IS NULL;

-- 7. Fazer o mesmo para acc_empresas (Contabilidade) para consistência
ALTER TABLE public.acc_empresas ALTER COLUMN tenant_id SET DEFAULT public.get_auth_tenant();
ALTER TABLE public.acc_empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master Admin Fin Empresas" ON public.acc_empresas;
DROP POLICY IF EXISTS "Tenants isolation acc" ON public.acc_empresas;

CREATE POLICY "Master Admin acc total" ON public.acc_empresas FOR ALL TO authenticated USING (public.is_master_admin());
CREATE POLICY "Tenants isolation acc" ON public.acc_empresas FOR ALL TO authenticated 
USING (tenant_id = public.get_auth_tenant())
WITH CHECK (tenant_id = public.get_auth_tenant());

UPDATE public.acc_empresas SET tenant_id = public.get_auth_tenant() WHERE tenant_id IS NULL;

-- Sincronizar schema
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO: Visibilidade das empresas restaurada e isolamento multi-empresa configurado.';
END $$;
