-- SCRIPT: REPAIR RLS FOR ARENA_RANKING
-- Objective: Bruteforce RLS policies for arena_ranking so all roles can Insert/Update/Delete unconditionally without row-level security blocking them.

-- 1. Enable RLS
ALTER TABLE public.arena_ranking ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing potentially conflicting policies
DROP POLICY IF EXISTS "Permitir leitura publica de arena_ranking" ON public.arena_ranking;
DROP POLICY IF EXISTS "Permitir tudo a autenticados em arena_ranking" ON public.arena_ranking;
DROP POLICY IF EXISTS "Enable read access for all users on arena_ranking" ON public.arena_ranking;
DROP POLICY IF EXISTS "Enable insert access for all users on arena_ranking" ON public.arena_ranking;
DROP POLICY IF EXISTS "Enable update access for all users on arena_ranking" ON public.arena_ranking;
DROP POLICY IF EXISTS "Enable delete access for all users on arena_ranking" ON public.arena_ranking;

-- 3. Create discrete policies for each action, granting access to public, anon, authenticated

-- SELECT
CREATE POLICY "Enable read access for all users on arena_ranking" 
ON public.arena_ranking FOR SELECT 
USING (true);

-- INSERT
CREATE POLICY "Enable insert access for all users on arena_ranking" 
ON public.arena_ranking FOR INSERT 
WITH CHECK (true);

-- UPDATE
CREATE POLICY "Enable update access for all users on arena_ranking" 
ON public.arena_ranking FOR UPDATE 
USING (true)
WITH CHECK (true);

-- DELETE
CREATE POLICY "Enable delete access for all users on arena_ranking" 
ON public.arena_ranking FOR DELETE 
USING (true);

-- 4. Force Reload
NOTIFY pgrst, 'reload schema';
