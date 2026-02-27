-- SCRIPT: REPAIR RLS FOR ARENA_GAMES
-- Objective: Bruteforce RLS policies for arena_games so all roles can Insert/Update/Delete unconditionally without row-level security blocking them.

-- 1. Ensure RLS is enabled
ALTER TABLE public.arena_games ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing potentially conflicting policies
DROP POLICY IF EXISTS "Permitir leitura publica de arena_games" ON public.arena_games;
DROP POLICY IF EXISTS "Permitir tudo a utilizadores autenticados em arena_games" ON public.arena_games;

-- 3. Create discrete policies for each action, granting access to public, anon, authenticated

-- SELECT
CREATE POLICY "Enable read access for all users on arena_games" 
ON public.arena_games FOR SELECT 
USING (true);

-- INSERT
CREATE POLICY "Enable insert access for all users on arena_games" 
ON public.arena_games FOR INSERT 
WITH CHECK (true);

-- UPDATE
CREATE POLICY "Enable update access for all users on arena_games" 
ON public.arena_games FOR UPDATE 
USING (true)
WITH CHECK (true);

-- DELETE
CREATE POLICY "Enable delete access for all users on arena_games" 
ON public.arena_games FOR DELETE 
USING (true);

-- 4. Force Reload
NOTIFY pgrst, 'reload schema';
