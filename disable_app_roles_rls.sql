
-- ==============================================================================
-- 🚨 TESTE DE DESACTIVAÇÃO DE RLS (SOLUÇÃO DE ÚLTIMO RECURSO) 🚨
-- Descrição: Desactiva completamente a segurança RLS na tabela para testar.
-- ==============================================================================

-- 1. DESACTIVAR RLS (Isso anula qualquer política de bloqueio)
ALTER TABLE public.app_roles DISABLE ROW LEVEL SECURITY;

-- 2. GARANTIR QUE UTILIZADORES PODEM ESCREVER (Permissões de PostgreSQL)
GRANT ALL ON public.app_roles TO authenticated;
GRANT ALL ON public.app_roles TO anon;
GRANT ALL ON public.app_roles TO service_role;

-- 3. VERIFICAR SE EXISTE ALGUM "TRIGGER" QUE POSSA ESTAR A FALHAR
-- (Por vezes erros de trigger são confundidos ou mascarados)
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgrelid = 'public.app_roles'::regclass;

-- 4. LIMPAR CACHE DO SUPABASE
NOTIFY pgrst, 'reload schema';

-- 5. VERIFICAR SE O ERRO PERSISTE
SELECT 'RLS Desactivado com sucesso. Tente guardar agora.' as status;
