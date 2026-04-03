-- RPC: fn_registrar_devolucao
-- Descrição: Registra uma devolução de forma atômica: cria registros de devolução, volta itens ao estoque e ajusta financeiro.

CREATE OR REPLACE FUNCTION public.fn_registrar_devolucao(
    _venda_id UUID,
    _cliente_id UUID,
    _empresa_id UUID,
    _motivo TEXT,
    _observacoes TEXT,
    _itens JSONB -- Array de {item_venda_id, produto_id, quantidade, valor_unitario}
) RETURNS JSONB AS $$
DECLARE
    v_devolucao_id UUID;
    v_item RECORD;
    v_total_devolvido NUMERIC(10, 2) := 0;
    v_saldo_aberto_restante NUMERIC(10, 2) := 0;
    v_valor_para_abater NUMERIC(10, 2);
    v_parcela RECORD;
    v_vendedor_id UUID;
BEGIN
    -- 1. Obter vendedor da venda original
    SELECT vendedor_id INTO v_vendedor_id FROM public.vendas WHERE id = _venda_id;

    -- Calcular total da devolução
    FOR v_item IN SELECT * FROM jsonb_to_recordset(_itens) AS x(item_venda_id UUID, produto_id UUID, quantidade NUMERIC, valor_unitario NUMERIC)
    LOOP
        v_total_devolvido := v_total_devolvido + (v_item.quantidade * v_item.valor_unitario);
    END LOOP;

    -- 2. Criar cabeçalho da devolução
    INSERT INTO public.devolucoes (
        empresa_id, venda_id, cliente_id, motivo, observacoes, valor_total_devolvido, created_by
    ) VALUES (
        _empresa_id, _venda_id, _cliente_id, _motivo, _observacoes, v_total_devolvido, auth.uid()
    ) RETURNING id INTO v_devolucao_id;

    -- 3. Processar itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(_itens) AS x(item_venda_id UUID, produto_id UUID, quantidade NUMERIC, valor_unitario NUMERIC)
    LOOP
        -- Inserir item_devolucao
        INSERT INTO public.itens_devolucao (
            devolucao_id, item_venda_id, produto_id, quantidade, valor_unitario, valor_total
        ) VALUES (
            v_devolucao_id, v_item.item_venda_id, v_item.produto_id, v_item.quantidade, v_item.valor_unitario, (v_item.quantidade * v_item.valor_unitario)
        );

        -- 4. Movimentar estoque (Entrada por Devolução)
        -- Usando tipo 'estorno' ou 'ajuste' conforme Enums. No sistema temos 'estorno' e 'entrada_reposicao'.
        INSERT INTO public.movimentos_estoque (
            empresa_id, produto_id, quantidade, tipo, observacoes, vendedor_id, data
        ) VALUES (
            _empresa_id, v_item.produto_id, v_item.quantidade, 'estorno', 'Devolução de Venda: ' || _venda_id, v_vendedor_id, now()
        );

        -- Atualizar saldo no estoque
        UPDATE public.estoque 
        SET quantidade = quantidade + v_item.quantidade, updated_at = now()
        WHERE empresa_id = _empresa_id AND produto_id = v_item.produto_id AND vendedor_id = v_vendedor_id;

        -- Se não tiver registro no estoque desse vendedor, cria um (emergencial)
        IF NOT FOUND THEN
            INSERT INTO public.estoque (empresa_id, produto_id, quantidade, vendedor_id)
            VALUES (_empresa_id, v_item.produto_id, v_item.quantidade, v_vendedor_id);
        END IF;
    END LOOP;

    -- 5. Ajuste Financeiro (Abatimento de Parcelas)
    v_valor_para_abater := v_total_devolvido;

    -- Iterar sobre parcelas não pagas (por vencimento decrescente para abater as últimas primeiro)
    FOR v_parcela IN 
        SELECT id, valor_total, valor_pago 
        FROM public.parcelas 
        WHERE venda_id = _venda_id AND status IN ('pendente', 'parcial', 'vencida')
        ORDER BY vencimento DESC
    LOOP
        EXIT WHEN v_valor_para_abater <= 0;

        DECLARE
            v_saldo_parcela NUMERIC(10, 2) := v_parcela.valor_total - v_parcela.valor_pago;
            v_abatimento_no_item NUMERIC(10, 2);
        BEGIN
            IF v_valor_para_abater >= v_saldo_parcela THEN
                v_abatimento_no_item := v_saldo_parcela;
                UPDATE public.parcelas 
                SET valor_total = valor_total - v_abatimento_no_item, 
                    status = CASE WHEN (valor_pago > 0) THEN 'paga'::status_parcela ELSE 'cancelada'::status_parcela END,
                    updated_at = now(),
                    observacoes = observacoes || ' [Abatido por Devolução]'
                WHERE id = v_parcela.id;
            ELSE
                v_abatimento_no_item := v_valor_para_abater;
                UPDATE public.parcelas 
                SET valor_total = valor_total - v_abatimento_no_item,
                    updated_at = now(),
                    observacoes = observacoes || ' [Valor Reduzido por Devolução]'
                WHERE id = v_parcela.id;
            END IF;

            v_valor_para_abater := v_valor_para_abater - v_abatimento_no_item;
        END;
    END LOOP;

    -- 6. Se ainda sobrar valor (venda já estava quitada ou devolução > saldo pendente)
    IF v_valor_para_abater > 0 AND _cliente_id IS NOT NULL THEN
        INSERT INTO public.credito_clientes (
            empresa_id, cliente_id, devolucao_id, valor, tipo, descricao, created_by
        ) VALUES (
            _empresa_id, _cliente_id, v_devolucao_id, v_valor_para_abater, 'entrada', 'Crédito gerado por devolução excedente da venda ' || _venda_id, auth.uid()
        );
    END IF;

    -- Marcar que impactos foram aplicados
    UPDATE public.devolucoes 
    SET impacto_estoque_aplicado = true, impacto_financeiro_aplicado = true 
    WHERE id = v_devolucao_id;

    RETURN jsonb_build_object(
        'success', true,
        'devolucao_id', v_devolucao_id,
        'valor_devolvido', v_total_devolvido,
        'valor_abatido_parcelas', v_total_devolvido - v_valor_para_abater,
        'valor_credito_gerado', v_valor_para_abater
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
