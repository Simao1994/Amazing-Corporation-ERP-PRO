-- =========================================================================================
-- FIX: PERMISSÕES DE PRESENÇA (ERP AMAZING)
-- Roda isto no SQL Editor do Supabase para resolver o erro de RLS no Registo de Ponto
-- =========================================================================================

-- 1. Limpar políticas antigas que podem estar a causar conflito
DROP POLICY IF EXISTS "Public Read hr_presencas" ON public.hr_presencas;
DROP POLICY IF EXISTS "Authenticated Insert hr_presencas" ON public.hr_presencas;
DROP POLICY IF EXISTS "Authenticated Update hr_presencas" ON public.hr_presencas;
DROP POLICY IF EXISTS "Abertura_Presencas_Total" ON public.hr_presencas;

-- 2. Garantir que RLS está activo (boas práticas) mas com política aberta
ALTER TABLE public.hr_presencas ENABLE ROW LEVEL SECURITY;

-- 3. Criar política ultra-permissiva para garantir que ninguém fica bloqueado ao bater o ponto
-- Isto permite que tanto Admin como Funcionários (mesmo com sessões instáveis) consigam gravar
CREATE POLICY "Abertura_Presencas_Total" 
ON public.hr_presencas 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Re-garantir permissões de acesso ao nível de role do Postgres
GRANT ALL ON public.hr_presencas TO authenticated;
GRANT ALL ON public.hr_presencas TO anon;
GRANT ALL ON public.hr_presencas TO service_role;

-- 5. Recarregar esquema
NOTIFY pgrst, 'reload schema';
