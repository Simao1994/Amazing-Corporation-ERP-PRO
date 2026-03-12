-- ==============================================================================
-- 🚀 TRANSACÇÃO ATÓMICA: FINALIZAÇÃO DE VENDA POS
-- Garante que fatura, itens, stock e caixa sejam processados como um único bloco.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.finalize_pos_sale(
    p_tenant_id UUID,
    p_usuario_id UUID,
    p_cliente_id UUID,
    p_caixa_id UUID,
    p_metodo_pagamento TEXT,
    p_subtotal DECIMAL,
    p_iva_total DECIMAL,
    p_total DECIMAL,
    p_cart_items JSONB -- Array de objetos: {produto_id, quantidade, preco_venda, preco_compra}
)
RETURNS JSONB AS $$
DECLARE
    v_fatura_id UUID;
    v_ncf TEXT;
    v_item JSONB;
    v_current_stock INTEGER;
    v_result JSONB;
BEGIN
    -- 1. Gerar Número de Fatura (NCF)
    v_ncf := 'NCF' || extract(epoch from now())::text;

    -- 2. Criar Fatura
    INSERT INTO public.pos_faturas (
        tenant_id, numero_fatura, usuario_id, cliente_id, caixa_id,
        subtotal, iva_total, total, valor_recebido, troco,
        metodo_pagamento, status
    ) VALUES (
        p_tenant_id, v_ncf, p_usuario_id, p_cliente_id, p_caixa_id,
        p_subtotal, p_iva_total, p_total, p_total, 0,
        p_metodo_pagamento, 'PAGA'
    ) RETURNING id INTO v_fatura_id;

    -- 3. Processar Itens do Carrinho
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        -- Inserir Item da Fatura
        INSERT INTO public.pos_fatura_itens (
            tenant_id, fatura_id, produto_id, quantidade,
            preco_compra, preco_venda, iva, lucro, total
        ) VALUES (
            p_tenant_id, v_fatura_id, (v_item->>'produto_id')::UUID, (v_item->>'quantidade')::INTEGER,
            (v_item->>'preco_compra')::DECIMAL, (v_item->>'preco_venda')::DECIMAL,
            ((v_item->>'preco_venda')::DECIMAL * 0.14 * (v_item->>'quantidade')::INTEGER),
            (((v_item->>'preco_venda')::DECIMAL - (v_item->>'preco_compra')::DECIMAL) * (v_item->>'quantidade')::INTEGER),
            ((v_item->>'preco_venda')::DECIMAL * 1.14 * (v_item->>'quantidade')::INTEGER)
        );

        -- Registrar Movimento de Stock
        INSERT INTO public.pos_movimento_stock (
            tenant_id, produto_id, tipo_movimento, quantidade,
            referencia, usuario_id
        ) VALUES (
            p_tenant_id, (v_item->>'produto_id')::UUID, 'VENDA', (v_item->>'quantidade')::INTEGER,
            v_ncf, p_usuario_id
        );

        -- Atualizar Stock (Dedução)
        UPDATE public.pos_estoque
        SET quantidade_atual = quantidade_atual - (v_item->>'quantidade')::INTEGER,
            updated_at = now()
        WHERE produto_id = (v_item->>'produto_id')::UUID
          AND tenant_id = p_tenant_id;
    END LOOP;

    -- 4. Registrar Movimento de Caixa
    INSERT INTO public.pos_movimentos_caixa (
        tenant_id, caixa_id, tipo, valor, descricao, usuario_id
    ) VALUES (
        p_tenant_id, p_caixa_id, 'VENDA', p_total, 'Venda ' || v_ncf, p_usuario_id
    );

    -- 5. Retornar Sucesso
    v_result := jsonb_build_object(
        'success', true,
        'fatura_id', v_fatura_id,
        'ncf', v_ncf
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- O PostgreSQL faz Rollback automático em caso de erro na função
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões
GRANT EXECUTE ON FUNCTION public.finalize_pos_sale(UUID, UUID, UUID, UUID, TEXT, DECIMAL, DECIMAL, DECIMAL, JSONB) TO authenticated;
