-- ================================================================
-- 🚀 REPARAÇÃO TOTAL DE RLS: SaaS & MASTER ADMIN
-- Execute este script INTEGRALMENTE no SQL Editor do Supabase.
-- ================================================================

-- 1. FUNÇÃO DE VERIFICAÇÃO ULTRA-RESILIENTE
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- 1. HARD-CHECK: ID específico do Simão (Fail-safe absoluto)
    -- Este ID foi confirmado na base de dados como sendo o Master Admin.
    IF auth.uid() = 'aee79bd9-edd2-4a36-8e4e-a1b5d0acd1d4' THEN
        RETURN TRUE;
    END IF;

    -- 2. CHECK DINÂMICO POR ROLE
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    RETURN COALESCE(v_role = 'saas_admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. LIMPEZA DE POLÍTICAS ANTERIORES
DROP POLICY IF EXISTS "Master Admin Empresas" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Access Tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Select Tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Insert Tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Update Tenants" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Delete Tenants" ON public.saas_tenants;

-- 3. POLÍTICAS GRANULARES PARA saas_tenants
CREATE POLICY "Admin Select Tenants" ON public.saas_tenants FOR SELECT TO authenticated USING (is_master_admin());
CREATE POLICY "Admin Insert Tenants" ON public.saas_tenants FOR INSERT TO authenticated WITH CHECK (is_master_admin());
CREATE POLICY "Admin Update Tenants" ON public.saas_tenants FOR UPDATE TO authenticated USING (is_master_admin()) WITH CHECK (is_master_admin());
CREATE POLICY "Admin Delete Tenants" ON public.saas_tenants FOR DELETE TO authenticated USING (is_master_admin());

-- 4. POLÍTICAS PARA saas_plans
DROP POLICY IF EXISTS "Master Admin Planos" ON public.saas_plans;
DROP POLICY IF EXISTS "Admin Access Plans" ON public.saas_plans;
CREATE POLICY "Admin Access Plans" ON public.saas_plans FOR ALL TO authenticated USING (is_master_admin()) WITH CHECK (is_master_admin());

-- 5. POLÍTICAS PARA saas_subscriptions
DROP POLICY IF EXISTS "Master Admin Subscrições" ON public.saas_subscriptions;
DROP POLICY IF EXISTS "Admin Access Subs" ON public.saas_subscriptions;
CREATE POLICY "Admin Access Subs" ON public.saas_subscriptions FOR ALL TO authenticated USING (is_master_admin()) WITH CHECK (is_master_admin());

-- 6. GARANTIR RLS ACTIVADO
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SUCESSO: RLS SaaS reparado. Master Admin Identificado: aee79bd9-edd2-4a36-8e4e-a1b5d0acd1d4';
END $$;
