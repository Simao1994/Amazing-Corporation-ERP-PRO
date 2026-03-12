-- ==============================================================================
-- 🚀 SCRIPT DE REPARAÇÃO PROFUNDA: PROFILES RLS E TENANTS
-- PROBLEMA: Utilizadores não conseguem ver o dashboard ou recebem erro "Não associado a nenhuma empresa"
-- CAUSA: Políticas RLS (Row Level Security) bloqueiam a auto-leitura do perfil,
--        ou a Empresa Raiz falhou na inserção prévia.
-- ==============================================================================

-- 1. DESATIVAR RLS TEMPORARIAMENTE PARA LIMPEZA GERAL
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenants DISABLE ROW LEVEL SECURITY;

-- 2. GARANTIR A EXISTÊNCIA DA EMPRESA RAIZ DO MASTER ADMIN
DO $$
DECLARE
    root_tenant UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    INSERT INTO public.saas_tenants (id, nome, slug, status, created_at)
    VALUES (root_tenant, 'Amazing Cloud Root', 'amazing-cloud-root', 'ativo', NOW())
    ON CONFLICT (id) DO UPDATE SET status = 'ativo';
END $$;

-- 3. ASSOCIAR TODOS OS ADMINISTRADORES ÓRFÃOS À EMPRESA RAIZ 
-- Se por algum motivo o utilizador perdeu a associação.
UPDATE public.profiles 
SET tenant_id = '00000000-0000-0000-0000-000000000000'
WHERE tenant_id IS NULL AND role IN ('saas_admin', 'admin', 'diretor');

-- (Garante o utilizador simaopambo94@gmail.com fica 100% associado)
UPDATE public.profiles
SET tenant_id = '00000000-0000-0000-0000-000000000000', role = 'saas_admin'
WHERE email = 'simaopambo94@gmail.com';

-- 4. ATUALIZAR POLÍTICAS RLS ESTRUTURAIS PARA OS PERFIS
-- Limpar possíveis políticas quebradas que impeçam a leitura
DROP POLICY IF EXISTS "Auto-Leitura de Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Auto-Edição de Perfil" ON public.profiles;
DROP POLICY IF EXISTS "Master Admin Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Qualquer utilizador autenticado pode sempre ler E alterar o SEU PRÓPRIO perfil.
CREATE POLICY "Users can read own profile strict" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile strict" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Master Admins podem ver todos os perfis
CREATE POLICY "Master Admin Read All Profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'saas_admin'
  )
);

-- 5. RE-ATIVAR A SEGURANÇA (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;

-- 6. VERIFICAÇÃO FINAL PARA A CONSOLA DO SUPABASE
DO $$
DECLARE
    total_orfam INT;
BEGIN
    SELECT COUNT(*) INTO total_orfam FROM public.profiles WHERE tenant_id IS NULL;
    IF total_orfam > 0 THEN
        RAISE WARNING '⚠️ Ainda existem % utilizadores sem tenant_id no sistema!', total_orfam;
    ELSE
        RAISE NOTICE '✅ Todos os utilizadores do sistema estão associados a uma empresa!';
    END IF;
END $$;
