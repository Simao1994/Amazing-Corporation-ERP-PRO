-- ==========================================
-- CRIAÇÃO DA TABELA DE CLIENTES POS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.pos_clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL DEFAULT public.get_auth_tenant(),
    nome text NOT NULL,
    nif text,
    email text,
    telefone text,
    morada text,
    controlo_credito boolean DEFAULT false,
    limite_credito numeric(15,2) DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT fk_pos_clientes_tenant FOREIGN KEY (tenant_id) REFERENCES public.saas_tenants(id) ON DELETE CASCADE
);

-- Ativar RLS
ALTER TABLE public.pos_clientes ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "RLS_POS_CLIENTES_TENANT_POLICY" ON public.pos_clientes;

-- Criar política unificada (Isolamento por Tenant + Master Admin)
CREATE POLICY "RLS_POS_CLIENTES_TENANT_POLICY" ON public.pos_clientes
FOR ALL TO authenticated
USING (tenant_id = public.get_auth_tenant() OR public.is_master_admin())
WITH CHECK (tenant_id = public.get_auth_tenant() OR public.is_master_admin());

-- Criar index para performance
CREATE INDEX IF NOT EXISTS idx_pos_clientes_tenant ON public.pos_clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_clientes_nome ON public.pos_clientes(nome);

-- Inserir Cliente Consumidor Final Padrão para cada Tenant existente
DO $$
DECLARE
    t_id uuid;
BEGIN
    FOR t_id IN SELECT id FROM public.saas_tenants LOOP
        IF NOT EXISTS (SELECT 1 FROM public.pos_clientes WHERE tenant_id = t_id AND nome = 'Consumidor Final') THEN
            INSERT INTO public.pos_clientes (tenant_id, nome, nif)
            VALUES (t_id, 'Consumidor Final', '999999999');
        END IF;
    END LOOP;
END $$;

-- Garantir que a tabela pos_faturas tem a chave estrangeira correta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'pos_faturas' AND constraint_name = 'fk_pos_faturas_cliente'
    ) THEN
        ALTER TABLE public.pos_faturas 
        ADD CONSTRAINT fk_pos_faturas_cliente 
        FOREIGN KEY (cliente_id) REFERENCES public.pos_clientes(id) ON DELETE SET NULL;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
