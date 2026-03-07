-- ==========================================
-- CORREÇÃO CRÍTICA: PERFIL ADMINISTRADOR EM FALTA
-- ==========================================

-- 1. Obter o ID do utilizador da tabela de autenticação (auth.users)
-- Como não sabemos o ID exato, vamos tentar inseri-lo para o email correto.
-- NOTA: O utilizador DEVE já estar registado no Supabase Auth.

DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Procurar o ID do utilizador pelo email na tabela interna do Supabase
    SELECT id INTO user_id FROM auth.users WHERE email = 'simaopambo94@gmail.com' LIMIT 1;

    IF user_id IS NULL THEN
        RAISE NOTICE 'Utilizador simaopambo94@gmail.com não encontrado no Auth. Certifique-se de que fez login pelo menos uma vez.';
    ELSE
        -- Inserir ou Atualizar o perfil com a role saas_admin
        INSERT INTO public.profiles (id, email, role, nome, updated_at)
        VALUES (
            user_id, 
            'simaopambo94@gmail.com', 
            'saas_admin', 
            'Simão Pambo Master', 
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET role = 'saas_admin', updated_at = NOW();
        
        RAISE NOTICE 'Perfil saas_admin criado com sucesso para o ID: %', user_id;
    END IF;
END $$;

-- 2. Garantir que o anon/authenticated podem ver a tabela profiles PARA o check de RLS
-- (O script anterior já devia ter feito isto, mas vamos reforçar)
DROP POLICY IF EXISTS "Perfis são visíveis por todos para RLS" ON public.profiles;
CREATE POLICY "Perfis são visíveis por todos para RLS" ON public.profiles
    FOR SELECT USING (true);

-- 3. Reset das tabelas SaaS (Opcional: Apenas se quiseres limpar o que estiver "pendurado")
-- DELETE FROM public.saas_plans;
