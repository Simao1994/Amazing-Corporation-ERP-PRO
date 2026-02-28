-- 1. Create table if not exists (or ensure columns)
CREATE TABLE IF NOT EXISTS public.hr_presencas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    entrada TEXT NOT NULL,
    saida TEXT,
    status TEXT DEFAULT 'Presente',
    horas_extras NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.hr_presencas ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Public Read hr_presencas" ON public.hr_presencas;
CREATE POLICY "Public Read hr_presencas" ON public.hr_presencas
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated Insert hr_presencas" ON public.hr_presencas;
CREATE POLICY "Authenticated Insert hr_presencas" ON public.hr_presencas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Update hr_presencas" ON public.hr_presencas;
CREATE POLICY "Authenticated Update hr_presencas" ON public.hr_presencas
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Unique constraint to avoid double Entry on same day for same employee
-- Note: This might already exist or need adjustment dependind on how "saida" is handled
-- But registrarPonto already checks for existing entry.
-- CREATE UNIQUE INDEX IF NOT EXISTS unique_daily_attendance ON hr_presencas (funcionario_id, data);
