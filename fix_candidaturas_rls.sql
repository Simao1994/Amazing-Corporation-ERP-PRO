-- ABRIR PERMISSÕES RLS PARA AS CANDIDATURAS
-- Isto garante que qualquer pessoa na internet consegue submeter uma candidatura à empresa 
-- e que os diretores / HR conseguem visualizá-las no portal sem bloqueios.

ALTER TABLE public.rh_candidaturas ENABLE ROW LEVEL SECURITY;

-- 1. Apagar policies antigas caso existam para limpar a cache
DROP POLICY IF EXISTS "Enable read access for all users" ON public.rh_candidaturas;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.rh_candidaturas;
DROP POLICY IF EXISTS "Enable update for all users" ON public.rh_candidaturas;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.rh_candidaturas;
DROP POLICY IF EXISTS "permitir_tudo_candidaturas" ON public.rh_candidaturas;

-- 2. Criar uma política universal que permite Inserção, Leitura, Update e Delete para candidatos e HR
CREATE POLICY "permitir_tudo_candidaturas" 
ON public.rh_candidaturas
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. Atualizar cache da API para ter efeito imediato
NOTIFY pgrst, 'reload schema';
