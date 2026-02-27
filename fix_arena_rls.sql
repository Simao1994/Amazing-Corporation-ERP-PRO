/* SCRIPT: FIX RLS FOR ARENA GAMER MODULE */

/* 0. GARANTIR QUE AS TABELAS EXISTEM ANTES DE APLICAR REGRAS */
CREATE TABLE IF NOT EXISTS public.arena_games (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text,
  descricao text,
  historico text,
  categoria text,
  imagem_url text,
  preco_sessao numeric DEFAULT 0,
  tempo_minutos integer,
  popularidade integer,
  status text DEFAULT 'Ativo',
  vagas_disponiveis integer,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arena_pagamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid,
  game_titulo text,
  tipo text DEFAULT 'jogo',
  valor numeric,
  metodo_pagamento text,
  criado_em timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Pendente',
  cliente_nome text,
  cliente_telefone text,
  referencia_transacao text,
  notas_admin text,
  confirmado_em timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.arena_tournaments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text,
  data_inicio date,
  data_fim date,
  premio text,
  status text DEFAULT 'Inscrições',
  vagas integer,
  vencedor text,
  game_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arena_ranking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text,
  score integer,
  last_game date,
  rank integer,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arena_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao text,
  valor numeric,
  categoria text,
  data date,
  created_at timestamp with time zone DEFAULT now()
);

/* 1. Activar RLS em todas as tabelas do Arena */
ALTER TABLE public.arena_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_expenses ENABLE ROW LEVEL SECURITY;

/* 2. arena_games */
DROP POLICY IF EXISTS "Permitir leitura publica de arena_games" ON public.arena_games;
CREATE POLICY "Permitir leitura publica de arena_games" 
ON public.arena_games FOR SELECT 
TO public, anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir tudo a utilizadores autenticados em arena_games" ON public.arena_games;
CREATE POLICY "Permitir tudo a utilizadores autenticados em arena_games" 
ON public.arena_games FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

/* 3. arena_pagamentos */
DROP POLICY IF EXISTS "Permitir leitura de pagamentos" ON public.arena_pagamentos;
CREATE POLICY "Permitir leitura de pagamentos" 
ON public.arena_pagamentos FOR SELECT 
TO public, anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserir pagamentos a anonimos" ON public.arena_pagamentos;
CREATE POLICY "Permitir inserir pagamentos a anonimos" 
ON public.arena_pagamentos FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir updates a autenticados em arena_pagamentos" ON public.arena_pagamentos;
CREATE POLICY "Permitir updates a autenticados em arena_pagamentos" 
ON public.arena_pagamentos FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

/* 4. arena_tournaments */
DROP POLICY IF EXISTS "Permitir leitura publica de arena_tournaments" ON public.arena_tournaments;
CREATE POLICY "Permitir leitura publica de arena_tournaments" 
ON public.arena_tournaments FOR SELECT 
TO public, anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir tudo a autenticados em arena_tournaments" ON public.arena_tournaments;
CREATE POLICY "Permitir tudo a autenticados em arena_tournaments" 
ON public.arena_tournaments FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

/* 5. arena_ranking */
DROP POLICY IF EXISTS "Permitir leitura publica de arena_ranking" ON public.arena_ranking;
CREATE POLICY "Permitir leitura publica de arena_ranking" 
ON public.arena_ranking FOR SELECT 
TO public, anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir tudo a autenticados em arena_ranking" ON public.arena_ranking;
CREATE POLICY "Permitir tudo a autenticados em arena_ranking" 
ON public.arena_ranking FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

/* 6. arena_expenses */
DROP POLICY IF EXISTS "Permitir tudo a autenticados em arena_expenses" ON public.arena_expenses;
CREATE POLICY "Permitir tudo a autenticados em arena_expenses" 
ON public.arena_expenses FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
