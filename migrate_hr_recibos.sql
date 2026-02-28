-- MIGRAÇÃO PARA ARMANEZAMENTO PERMANENTE DE FOLHAS DE SALÁRIO
-- Expandindo a tabela hr_recibos para conter todos os detalhes do ReciboSalarial

-- 1. Remover tabela anterior se necessário (CUIDADO: Isso limpa dados de teste)
-- DROP TABLE IF EXISTS public.hr_recibos;

-- 2. Criar ou Alterar a tabela
CREATE TABLE IF NOT EXISTS public.hr_recibos (
  id text PRIMARY KEY, -- Usamos text para suportar o formato REC-XXXXXXXX de frontend
  funcionario_id uuid REFERENCES public.profiles(id),
  nome text NOT NULL,
  cargo text,
  bilhete text,
  mes text NOT NULL,
  ano integer NOT NULL,
  base numeric DEFAULT 0,
  subsidios numeric DEFAULT 0,
  subsidio_alimentacao numeric DEFAULT 0,
  subsidio_transporte numeric DEFAULT 0,
  subsidio_ferias numeric DEFAULT 0,
  subsidio_natal numeric DEFAULT 0,
  horas_extras_valor numeric DEFAULT 0,
  bonus_premios numeric DEFAULT 0,
  total_proventos numeric DEFAULT 0,
  faltas_desconto numeric DEFAULT 0,
  inss_trabalhador numeric DEFAULT 0,
  irt numeric DEFAULT 0,
  adiantamentos numeric DEFAULT 0,
  emprestimos numeric DEFAULT 0,
  outros_descontos numeric DEFAULT 0,
  bruto numeric DEFAULT 0,
  liquido numeric DEFAULT 0,
  data_emissao timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.hr_recibos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso
DROP POLICY IF EXISTS "Todos podem ver recibos" ON public.hr_recibos;
CREATE POLICY "Todos podem ver recibos" 
ON public.hr_recibos FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Apenas admin e RH podem processar folha" ON public.hr_recibos;
CREATE POLICY "Apenas admin e RH podem processar folha" 
ON public.hr_recibos FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'director_hr')
  )
);

-- 5. Grant para garantir acesso à API
GRANT ALL ON public.hr_recibos TO authenticated;
GRANT ALL ON public.hr_recibos TO anon;
GRANT ALL ON public.hr_recibos TO service_role;
