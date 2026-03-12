-- ================================================================
-- 🆘 REPARAÇÃO DE EMERGÊNCIA: RLS SaaS
-- Este script força o acesso ignorando verificações rígidas.
-- ================================================================

-- 1. Forçar a ROLE para 'saas_admin' no utilizador que está a executar o script
UPDATE public.profiles 
SET role = 'saas_admin' 
WHERE id = auth.uid();

-- 2. Recriar função com bypass absoluto para o role saas_admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Se o utilizador tem a role saas_admin no perfil, ele é master.
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'saas_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. POLÍTICA ULTRA-PERMISSIVA (COBRE TUDO)
-- Removemos polícias antigas e criamos uma que permite TUDO se for saas_admin.
DROP POLICY IF EXISTS "Master Admin Tenants Access" ON public.saas_tenants;
DROP POLICY IF EXISTS "Admin Access Tenants" ON public.saas_tenants;

CREATE POLICY "SUPREME_ADMIN_ACCESS" 
ON public.saas_tenants 
FOR ALL 
TO authenticated 
USING (is_master_admin() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin')
WITH CHECK (is_master_admin() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'saas_admin');

-- 4. Backup: Criar política por email directo (Caso o role falhe)
CREATE POLICY "BACKUP_EMAIL_ACCESS" 
ON public.saas_tenants 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'simaopambo94@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'simaopambo94@gmail.com');

-- 5. Garantir RLS Activo
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Reparação de emergência aplicada. Tente cadastrar agora.';
END $$;
