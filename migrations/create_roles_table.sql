-- Migração para suporte a cargos dinâmicos e permissões manuais

-- 1. Criar tabela de cargos se não existir
CREATE TABLE IF NOT EXISTS public.app_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_key TEXT UNIQUE NOT NULL, -- Ex: 'operario', 'gestor_vendas'
    label TEXT NOT NULL,          -- Ex: 'Operário', 'Gestor de Vendas'
    allowed_modules TEXT[] DEFAULT '{}', -- Array de IDs de MENU_ITEMS (ex: ['home', 'dashboard'])
    is_system BOOLEAN DEFAULT FALSE, -- Se TRUE, não pode ser apagado (cargos core)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso (Seguro para re-executar)
DROP POLICY IF EXISTS "Leitura pública para utilizadores autenticados" ON public.app_roles;
CREATE POLICY "Leitura pública para utilizadores autenticados" 
ON public.app_roles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Apenas admin pode modificar cargos" ON public.app_roles;
CREATE POLICY "Apenas admin pode modificar cargos" 
ON public.app_roles FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 4. Garantir que o SEU utilizador atual é ADMIN
-- NOTA: auth.uid() não funciona no SQL Editor sem "impersonate".
-- Use o seu email real abaixo (Ex: 'admin@amazing.com')
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'SEU_EMAIL_AQUI'; 

-- --- DIAGNÓSTICO (Opcional: Execute para verificar o seu estado) ---
-- SELECT id, email, role FROM public.profiles WHERE role = 'admin';
-- SELECT role_key, label FROM public.app_roles;

-- 5. Inserir cargos existentes como base (Seed)
INSERT INTO public.app_roles (role_key, label, allowed_modules, is_system)
VALUES 
    ('admin', 'Administrador', ARRAY['all'], true),
    ('director_hr', 'Director Recursos Humanos', ARRAY['home', 'dashboard', 'rh', 'candidaturas', 'solicitacoes', 'blog'], true),
    ('director_finance', 'Director Finanças', ARRAY['home', 'dashboard', 'financeiro', 'solicitacoes', 'blog', 'empresas'], true),
    ('operario', 'Operário (Acesso Restrito)', ARRAY['home', 'dashboard', 'galeria_corp', 'biblioteca'], true)
ON CONFLICT (role_key) DO UPDATE 
SET label = EXCLUDED.label, is_system = EXCLUDED.is_system;

-- 5. Comentário descritivo
COMMENT ON TABLE public.app_roles IS 'Armazena permissões dinâmicas por cargo para o sistema ERP.';
