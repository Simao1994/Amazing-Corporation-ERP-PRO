-- ==============================================================================
-- MÓDULO DE VENDAS E PONTO DE VENDA (POS)
-- Criado para suportar facturação, controlo de stock e terminais de venda.
-- Padronizado para usar tenant_id em vez de empresa_id.
-- ==============================================================================

-- 1. CATEGORIAS DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.pos_categorias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    nome_categoria text NOT NULL,
    descricao text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. PRODUTOS
CREATE TABLE IF NOT EXISTS public.pos_produtos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    codigo_produto text NOT NULL,
    nome_produto text NOT NULL,
    categoria_id uuid REFERENCES public.pos_categorias(id) ON DELETE SET NULL,
    preco_compra numeric(10,2) NOT NULL DEFAULT 0,
    preco_venda numeric(10,2) NOT NULL DEFAULT 0,
    imposto_id uuid, -- Referência futura se houver tabela separada de impostos ou enum
    unidade text DEFAULT 'UN',
    stock_minimo numeric(10,2) DEFAULT 0,
    qr_code text,
    ativo boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. ESTOQUE
CREATE TABLE IF NOT EXISTS public.pos_estoque (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    produto_id uuid REFERENCES public.pos_produtos(id) ON DELETE CASCADE NOT NULL,
    quantidade_atual numeric(15,2) DEFAULT 0 NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, produto_id)
);

-- 4. MOVIMENTO DE STOCK
CREATE TABLE IF NOT EXISTS public.pos_movimento_stock (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    produto_id uuid REFERENCES public.pos_produtos(id) ON DELETE CASCADE NOT NULL,
    tipo_movimento text NOT NULL CHECK (tipo_movimento IN ('ENTRADA', 'VENDA', 'AJUSTE', 'DEVOLUCAO')),
    quantidade numeric(15,2) NOT NULL,
    referencia text,
    usuario_id uuid,
    data date DEFAULT CURRENT_DATE NOT NULL,
    hora time DEFAULT CURRENT_TIME NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. CAIXA DIÁRIO
CREATE TABLE IF NOT EXISTS public.pos_caixa (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    usuario_id uuid NOT NULL,
    data_abertura date DEFAULT CURRENT_DATE NOT NULL,
    hora_abertura time DEFAULT CURRENT_TIME NOT NULL,
    valor_inicial numeric(15,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO')),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 6. FATURAS / VENDAS
CREATE TABLE IF NOT EXISTS public.pos_faturas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    numero_fatura text NOT NULL,
    cliente_id uuid,
    usuario_id uuid NOT NULL,
    caixa_id uuid REFERENCES public.pos_caixa(id) ON DELETE SET NULL,
    data_emissao date DEFAULT CURRENT_DATE NOT NULL,
    hora_emissao time DEFAULT CURRENT_TIME NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    iva_total numeric(15,2) DEFAULT 0 NOT NULL,
    total numeric(15,2) DEFAULT 0 NOT NULL,
    valor_recebido numeric(15,2) DEFAULT 0 NOT NULL,
    troco numeric(15,2) DEFAULT 0 NOT NULL,
    metodo_pagamento text NOT NULL,
    status text DEFAULT 'PAGA' CHECK (status IN ('PAGA', 'CANCELADA', 'PENDENTE')),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 7. ITENS DA FATURA
CREATE TABLE IF NOT EXISTS public.pos_fatura_itens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL, -- Adicionado para facilitar RLS
    fatura_id uuid REFERENCES public.pos_faturas(id) ON DELETE CASCADE NOT NULL,
    produto_id uuid REFERENCES public.pos_produtos(id) ON DELETE SET NULL,
    quantidade numeric(15,2) NOT NULL,
    preco_compra numeric(15,2) NOT NULL DEFAULT 0,
    preco_venda numeric(15,2) NOT NULL DEFAULT 0,
    iva numeric(15,2) NOT NULL DEFAULT 0,
    lucro numeric(15,2) NOT NULL DEFAULT 0,
    total numeric(15,2) NOT NULL DEFAULT 0
);

-- 8. MOVIMENTOS DE CAIXA
CREATE TABLE IF NOT EXISTS public.pos_movimentos_caixa (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    caixa_id uuid REFERENCES public.pos_caixa(id) ON DELETE CASCADE NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('VENDA', 'ENTRADA', 'SAIDA', 'TROCO')),
    valor numeric(15,2) NOT NULL,
    descricao text,
    usuario_id uuid NOT NULL,
    data date DEFAULT CURRENT_DATE NOT NULL,
    hora time DEFAULT CURRENT_TIME NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 9. FECHAMENTO DE CAIXA
CREATE TABLE IF NOT EXISTS public.pos_fechamento_caixa (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid DEFAULT public.get_auth_tenant() NOT NULL,
    caixa_id uuid REFERENCES public.pos_caixa(id) ON DELETE CASCADE NOT NULL,
    valor_esperado numeric(15,2) NOT NULL,
    valor_contado numeric(15,2) NOT NULL,
    diferenca numeric(15,2) NOT NULL,
    data_fechamento date DEFAULT CURRENT_DATE NOT NULL,
    hora_fechamento time DEFAULT CURRENT_TIME NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(caixa_id)
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Activar RLS em todas as tabelas
ALTER TABLE public.pos_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_movimento_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_fatura_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_movimentos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_fechamento_caixa ENABLE ROW LEVEL SECURITY;

-- Aplicar políticas de segurança para multi-tenancy
DO $$ 
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(array[
            'pos_categorias', 
            'pos_produtos', 
            'pos_estoque', 
            'pos_movimento_stock', 
            'pos_caixa', 
            'pos_faturas', 
            'pos_fatura_itens',
            'pos_movimentos_caixa', 
            'pos_fechamento_caixa'
        ])
    LOOP
        -- Remover qualquer política anterior para evitar erro de duplicidade
        EXECUTE format('DROP POLICY IF EXISTS "RLS_POS_TENANT_POLICY" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Isolamento por empresa_id para %I" ON public.%I', t_name, t_name);
        
        -- Criar nova política padronizada
        EXECUTE format('
            CREATE POLICY "RLS_POS_TENANT_POLICY" ON public.%I
                FOR ALL 
                USING (tenant_id = public.get_auth_tenant() OR public.is_master_admin());
        ', t_name);
    END LOOP;
END $$;

-- ==========================================
-- TRIGGERS E FUNÇÕES AUTOMÁTICAS
-- ==========================================

-- Trigger: Actualizar updated_at do estoque
CREATE OR REPLACE FUNCTION update_estoque_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_estoque ON public.pos_estoque;
CREATE TRIGGER trigger_update_estoque
BEFORE UPDATE ON public.pos_estoque
FOR EACH ROW EXECUTE FUNCTION update_estoque_updated_at();

-- Trigger: Criar registo de stock automatico na inserção de produto novo
CREATE OR REPLACE FUNCTION ensure_estoque_produto()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pos_estoque (tenant_id, produto_id, quantidade_atual)
    VALUES (NEW.tenant_id, NEW.id, 0)
    ON CONFLICT (tenant_id, produto_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_estoque ON public.pos_produtos;
CREATE TRIGGER trigger_ensure_estoque
AFTER INSERT ON public.pos_produtos
FOR EACH ROW EXECUTE FUNCTION ensure_estoque_produto();

-- ==============================================================================
-- Fim do script de migração do Módulo de Vendas e POS
-- ==============================================================================
