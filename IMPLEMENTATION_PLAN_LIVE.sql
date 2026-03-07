-- ================================================================
-- 🎥 MÓDULO DE TRANSMISSÕES AO VIVO (SAAS MULTI-TENANT)
-- Execute este script no SQL Editor do Supabase.
-- ================================================================

-- 1. Criar a tabela 'lives'
CREATE TABLE IF NOT EXISTS public.lives (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    descricao text,
    plataforma text NOT NULL,
    link_live text NOT NULL,
    status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'ao_vivo', 'encerrada')),
    data_inicio timestamptz,
    data_fim timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Habilitar o RLS (Row Level Security) na tabela
ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas RLS para Isolamento de Tenant (Empresas)

-- Política de Visualização Pública: Qualquer pessoa (anónima ou com sessão) pode ver transmissões públicas.
-- Assume-se que a página pública tem a capacidade de consultar independentemente de estar logada.
CREATE POLICY "lives_view_public"
ON public.lives
FOR SELECT
TO public
USING (true);

-- Política de Inserção: Um utilizador autenticado só pode inserir na conta (tenant_id) à qual pertence.
CREATE POLICY "lives_insert_tenant"
ON public.lives
FOR INSERT
TO authenticated
WITH CHECK (
    empresa_id IN (
        SELECT id FROM public.saas_tenants 
        WHERE id = (auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id'::text
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.tenant_id = lives.empresa_id
    )
);

-- Política de Atualização: Só pode atualizar as lives do seu próprio tenant_id
CREATE POLICY "lives_update_tenant"
ON public.lives
FOR UPDATE
TO authenticated
USING (
    empresa_id IN (
        SELECT id FROM public.saas_tenants 
        WHERE id = (auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id'::text
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.tenant_id = lives.empresa_id
    )
);

-- Política de Exclusão: Só pode apagar as lives do seu próprio tenant_id
CREATE POLICY "lives_delete_tenant"
ON public.lives
FOR DELETE
TO authenticated
USING (
    empresa_id IN (
        SELECT id FROM public.saas_tenants 
        WHERE id = (auth.jwt() ->> 'user_metadata')::jsonb ->> 'tenant_id'::text
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.tenant_id = lives.empresa_id
    )
);

-- 4. Função auxiliar: Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_lives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lives_updated_at ON public.lives;
CREATE TRIGGER trg_lives_updated_at
BEFORE UPDATE ON public.lives
FOR EACH ROW
EXECUTE FUNCTION public.update_lives_updated_at();

-- 5. Dar permissões básicas aos papéis de anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lives TO authenticated;
GRANT SELECT ON public.lives TO anon;

DO $$
BEGIN 
    RAISE NOTICE '✅ Tabela de Lives Multi-Tenant instalada com sucesso no Supabase!';
END $$;
