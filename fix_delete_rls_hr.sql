-- Fix DELETE RLS policies for HR-related tables
-- Run this on the Supabase SQL Editor if the migration tool fails.
-- All policies are idempotent (safe to run multiple times).

-- funcionarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'funcionarios' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "allow_authenticated_delete_funcionarios"
      ON public.funcionarios FOR DELETE TO authenticated USING (true);
  END IF;
END$$;

-- hr_metas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hr_metas' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "allow_authenticated_delete_hr_metas"
      ON public.hr_metas FOR DELETE TO authenticated USING (true);
  END IF;
END$$;

-- hr_presencas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hr_presencas' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "allow_authenticated_delete_hr_presencas"
      ON public.hr_presencas FOR DELETE TO authenticated USING (true);
  END IF;
END$$;

-- hr_recibos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hr_recibos' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "allow_authenticated_delete_hr_recibos"
      ON public.hr_recibos FOR DELETE TO authenticated USING (true);
  END IF;
END$$;

-- rh_contas_bancarias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rh_contas_bancarias' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "allow_authenticated_delete_rh_contas_bancarias"
      ON public.rh_contas_bancarias FOR DELETE TO authenticated USING (true);
  END IF;
END$$;

NOTIFY pgrst, 'reload schema';
