-- ==========================================
-- 🚀 ADD MISSING FIELDS TO SAAS_PLANS
-- ==========================================

-- 1. Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'max_users') THEN
        ALTER TABLE public.saas_plans ADD COLUMN max_users integer DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'modules') THEN
        ALTER TABLE public.saas_plans ADD COLUMN modules jsonb DEFAULT '["ALL"]'::jsonb;
    END IF;
END $$;

-- 2. Update existing records with meaningful defaults if they were null
UPDATE public.saas_plans SET max_users = 10 WHERE max_users IS NULL;
UPDATE public.saas_plans SET modules = '["ALL"]'::jsonb WHERE modules IS NULL;

-- 3. Add auto_renew to saas_subscriptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_subscriptions' AND column_name = 'auto_renew') THEN
        ALTER TABLE public.saas_subscriptions ADD COLUMN auto_renew boolean DEFAULT false;
    END IF;
END $$;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
