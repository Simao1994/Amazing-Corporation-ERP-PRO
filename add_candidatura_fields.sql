-- Adicionar novos campos do candidato à tabela rh_candidaturas

ALTER TABLE public.rh_candidaturas 
ADD COLUMN IF NOT EXISTS pretensao_salarial text,
ADD COLUMN IF NOT EXISTS nivel_academico text,
ADD COLUMN IF NOT EXISTS curso text,
ADD COLUMN IF NOT EXISTS bi text,
ADD COLUMN IF NOT EXISTS estado_civil text,
ADD COLUMN IF NOT EXISTS disponibilidade text,
ADD COLUMN IF NOT EXISTS telefone_alternativo text,
ADD COLUMN IF NOT EXISTS morada text,
ADD COLUMN IF NOT EXISTS provincia text,
ADD COLUMN IF NOT EXISTS naturalidade text,
ADD COLUMN IF NOT EXISTS expectativa_5_anos text,
ADD COLUMN IF NOT EXISTS sobre_mim text;

-- Limpar cache
NOTIFY pgrst, 'reload schema';
