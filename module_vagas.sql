-- =========================================================================================
-- MÓDULO DE RECRUTAMENTO / CARREIRAS (AMAZING CORPORATION)
-- Roda isto no SQL Editor do Supabase (Mesmo Projecto: jgktemwegesmmomlftgt)
-- =========================================================================================

-- 1. TABELA DE VAGAS DE EMPREGO (Geridas pelo RH, Lidas pelo Público)
CREATE TABLE IF NOT EXISTS public.rh_vagas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text NOT NULL,
  requisitos text,
  responsabilidades text,
  localizacao text,
  tipo_contrato text,
  nivel_experiencia text,
  salario text,
  quantidade integer DEFAULT 1,
  status text DEFAULT 'ativa',
  data_publicacao timestamp with time zone DEFAULT now(),
  data_encerramento timestamp with time zone,
  criado_em timestamp with time zone DEFAULT now()
);

-- 2. TABELA DE CANDIDATURAS PÚBLICAS (Recepção de CVs Externa)
CREATE TABLE IF NOT EXISTS public.rh_candidaturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vaga_id uuid REFERENCES public.rh_vagas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  cv_path text,
  mensagem text,
  status text DEFAULT 'pendente',
  data_envio timestamp with time zone DEFAULT now()
);

-- =========================================================================================
-- SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- =========================================================================================
ALTER TABLE public.rh_vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_candidaturas ENABLE ROW LEVEL SECURITY;

-- VAGAS: Qualquer pessoa no mundo (anon) pode ver as vagas abertas no site. 
CREATE POLICY "Público visualiza vagas ativas" ON public.rh_vagas 
  FOR SELECT USING (status = 'ativa');

-- VAGAS: O RH logado (authenticated) controla, lê, insere e edita todas as vagas sem limite.
CREATE POLICY "RH Admin controla vagas" ON public.rh_vagas 
  FOR ALL USING (auth.role() = 'authenticated');

-- CANDIDATURAS: Visitantes podem enviar dados para aqui sem login (INSERT permito para TODOS)
CREATE POLICY "Candidatos enviam currículo" ON public.rh_candidaturas 
  FOR INSERT WITH CHECK (true);

-- CANDIDATURAS: Mas só o RH autenticado consegue ver e gerir quem enviou!
CREATE POLICY "Painel RH lê candidaturas recebidas" ON public.rh_candidaturas 
  FOR ALL USING (auth.role() = 'authenticated');


-- =========================================================================================
-- PERMISSÕES BÁSICAS DA API (PARA O POSTGREST SABER QUE AS TABELAS SÃO "ÚTEIS")
-- =========================================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.rh_vagas TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.rh_candidaturas TO anon, authenticated;

-- Forçar limpeza de memória do Supabase para reconhecer já as regras
NOTIFY pgrst, 'reload schema';

-- **NOTA SOBRE O UPLOAD DO FICHEIRO:**
-- Não se esqueça de criar um BUCKET no Storage do Supabase chamado "cv_uploads"
-- E garantir que na secção de Policies do Bucket as pessoas "anon" podem fazer INSERT nele!
