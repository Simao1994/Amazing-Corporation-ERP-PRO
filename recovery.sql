-- ==============================================================================
-- 🚨 SCRIPT DE RECUPERAÇÃO DE DADOS (SAFE RESTORE) 🚨
-- Projeto: Amazing Corporation ERP PRO
-- Destino: https://jgktemwegesmmomlftgt.supabase.co
-- Funcionalidade: Cria todas as tabelas em falta sem apagar ou afetar o que já existe!
-- ==============================================================================

-- 1. PROFILES E FUNCIONÁRIOS (Core)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text,
  role text,
  email text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funcionarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  data_nascimento date,
  funcao text,
  bilhete text,
  telefone text,
  morada text,
  departamento_id uuid,
  data_admissao date,
  tipo_contrato text,
  status text DEFAULT 'ativo',
  nivel_escolaridade text,
  area_formacao text,
  salario_base numeric DEFAULT 0,
  subsidio_alimentacao numeric DEFAULT 0,
  subsidio_transporte numeric DEFAULT 0,
  bonus_assiduidade numeric DEFAULT 0,
  outros_bonus numeric DEFAULT 0,
  foto_url text,
  tempo_contrato text,
  empresa_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. RECURSOS HUMANOS (Aba Contas e Recibos)
CREATE TABLE IF NOT EXISTS public.rh_contas_bancarias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid,
  nome_banco text NOT NULL,
  numero_conta text NOT NULL,
  iban text,
  swift_bic text,
  tipo_conta text, 
  moeda text DEFAULT 'AOA',
  titular_conta text, 
  pais_banco text DEFAULT 'Angola',
  codigo_banco text,
  codigo_agencia text,
  principal boolean DEFAULT false,
  status text DEFAULT 'ativo', 
  observacoes text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rh_recibos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid,
  nome text,
  mes text,
  ano integer,
  base numeric,
  subsidios numeric,
  subsidio_alimentacao numeric,
  subsidio_transporte numeric,
  horas_extras_valor numeric,
  bonus_premios numeric,
  faltas_desconto numeric,
  inss_trabalhador numeric,
  irt numeric,
  adiantamentos numeric,
  bruto numeric,
  liquido numeric,
  data_emissao timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_recibos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid,
  nome text,
  mes text,
  ano integer,
  liquido numeric,
  data_emissao timestamp with time zone DEFAULT now()
);

-- 3. CONTABILIDADE (Accounting RLS & Data)
CREATE TABLE IF NOT EXISTS public.acc_periodos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer,
  mes integer,
  status text DEFAULT 'Aberto',
  data_fecho timestamp with time zone,
  empresa_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_contas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text,
  nome text,
  tipo text,
  natureza text,
  nivel integer,
  pai_id text,
  e_analitica boolean DEFAULT false,
  e_sintetica boolean DEFAULT false,
  aceita_lancamentos boolean DEFAULT true,
  centro_custo_id uuid,
  empresa_id uuid,
  data_criacao timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_lancamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data date,
  periodo_id uuid,
  mes_referencia text,
  ano_referencia integer,
  descricao text,
  empresa_id uuid,
  usuario_id uuid,
  usuario_nome text,
  status text DEFAULT 'Pendente',
  tipo_transacao text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_centros_custo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text,
  nome text,
  tipo text DEFAULT 'Custo',
  descricao text,
  empresa_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_documentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text,
  descricao text,
  nome_arquivo text,
  tipo_arquivo text,
  tamanho_arquivo numeric,
  caminho text,
  categoria_id uuid,
  responsavel_id uuid,
  tags text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_tipos_documentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text,
  nome text,
  descricao text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_regras_integracao (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text,
  tipo text,
  conta_debito text,
  conta_credito text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text UNIQUE,
  valor text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acc_auditoria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela text,
  acao text,
  usuario text,
  data timestamp with time zone DEFAULT now(),
  detalhes jsonb
);

CREATE TABLE IF NOT EXISTS public.acc_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem text,
  nivel text,
  usuario_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. ARENA GAMER
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
  valor numeric,
  metodo text,
  data timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Pendente',
  cliente_nome text,
  cliente_telefone text,
  referencia_externa text
);

-- 5. BLOG / INSTITUCIONAL
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text,
  categoria text,
  conteudo text,
  autor text,
  data timestamp with time zone DEFAULT now(),
  imagem_url text,
  video_url text,
  galeria_urls jsonb,
  tipo text DEFAULT 'artigo',
  is_publico boolean DEFAULT true,
  visualizacoes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. PERMISSÕES COMPLETAS (API) - Necessário para que o Código consiga aceder
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 7. METAS DE PERFORMANCE
CREATE TABLE IF NOT EXISTS public.hr_metas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    progresso integer DEFAULT 0,
    prazo date NOT NULL,
    status text DEFAULT 'Em curso',
    created_at timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.hr_metas TO anon, authenticated, service_role;

-- Forçar o Supabase PostgREST a engolir a nova cache
NOTIFY pgrst, 'reload schema';
