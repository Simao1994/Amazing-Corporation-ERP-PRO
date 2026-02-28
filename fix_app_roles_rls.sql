
-- ==============================================================================
-- 🚨 CORREÇÃO FINAL: RLS DOS CARGOS E PERFIS 🚨
-- Descrição: Garante que os cargos podem ser guardados por admins e 
--             automatiza a criação de perfis para evitar erros de RLS.
-- ==============================================================================

-- 1. Garantir RLS na tabela de perfis (Melhor Prática)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Permitir que utilizadores autenticados vejam os perfis (Necessário para o check de RLS em outras tabelas)
DROP POLICY IF EXISTS "Leitura de perfis para autenticados" ON public.profiles;
CREATE POLICY "Leitura de perfis para autenticados" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 3. Permitir que o utilizador atualize o seu próprio perfil
DROP POLICY IF EXISTS "Utilizadores podem atualizar o seu próprio perfil" ON public.profiles;
CREATE POLICY "Utilizadores podem atualizar o seu próprio perfil" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 4. Função e Gatilho para criar perfil automaticamente ao registar no Supabase Auth
-- Isso evita o erro de "profile missing" que quebra o RLS do app_roles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), 
    new.email, 
    'admin' -- Por padrão neste ERP, o primeiro utilizador/admin costuma ser admin
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar o gatilho (apenas se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. CORREÇÃO IMEDIATA: Garantir que o utilizador Engenheiro Simão é admin
-- Se o perfil não existir, este comando cria-o manualmente.
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'nome', 'Administrador'), 'admin'
FROM auth.users
WHERE email ILIKE 'simaopambo94@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- 6. Reforçar a política da tabela app_roles
DROP POLICY IF EXISTS "Apenas admin pode modificar cargos" ON public.app_roles;
CREATE POLICY "Apenas admin pode modificar cargos" 
ON public.app_roles FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'director_hr') -- Expandir se necessário
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'director_hr')
    )
);

-- 7. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
