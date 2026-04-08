-- RPC: fn_registrar_devolucao
-- Descrição: Registra uma devolução de forma atômica: cria registros de devolução, volta itens ao estoque e ajusta financeiro.

CREATE OR REPLACE FUNCTION public.fn_registrar_devolucao(
    _venda_id UUID,
    _cliente_id UUID,
    _empresa_id UUID,
    _motivo TEXT,
    _observacoes TEXT,
    _itens JSONB,
    _tipo_impacto TEXT DEFAULT 'auto' -- 'auto', 'total_credito', 'estoque_apenas'
) RETURNS JSONB AS $$
DECLARE
    v_devolucao_id UUID;
    v_item RECORD;
    v_total_devolvido NUMERIC(10, 2) := 0;
    v_valor_para_abater NUMERIC(10, 2);
    v_parcela RECORD;
    v_vendedor_id UUID;
BEGIN
    -- Validação de Segurança
    IF _empresa_id != public.get_my_empresa_id() THEN
        RAISE EXCEPTION 'Ação não permitida para esta empresa.';
    END IF;

    SELECT vendedor_id INTO v_vendedor_id FROM public.vendas WHERE id = _venda_id;

    -- Calcular total
    FOR v_item IN SELECT * FROM jsonb_to_recordset(_itens) AS x(item_venda_id UUID, produto_id UUID, quantidade NUMERIC, valor_unitario NUMERIC)
    LOOP
        v_total_devolvido := v_total_devolvido + (v_item.quantidade * v_item.valor_unitario);
    END LOOP;

    -- Criar Devolução
    INSERT INTO public.devolucoes (
        empresa_id, venda_id, cliente_id, motivo, observacoes, valor_total_devolvido, created_by
    ) VALUES (
        _empresa_id, _venda_id, _cliente_id, _motivo, _observacoes, v_total_devolvido, auth.uid()
    ) RETURNING id INTO v_devolucao_id;

    -- Itens e Estoque
    FOR v_item IN SELECT * FROM jsonb_to_recordset(_itens) AS x(item_venda_id UUID, produto_id UUID, quantidade NUMERIC, valor_unitario NUMERIC)
    LOOP
        INSERT INTO public.itens_devolucao (
            empresa_id, devolucao_id, item_venda_id, produto_id, quantidade, valor_unitario, valor_total
        ) VALUES (
            _empresa_id, v_devolucao_id, v_item.item_venda_id, v_item.produto_id, v_item.quantidade, v_item.valor_unitario, (v_item.quantidade * v_item.valor_unitario)
        );

        INSERT INTO public.movimentos_estoque (
            empresa_id, produto_id, quantidade, tipo, observacoes, vendedor_id, data
        ) VALUES (
            _empresa_id, v_item.produto_id, v_item.quantidade, 'estorno', 'Devolução: ' || v_devolucao_id, v_vendedor_id, now()
        );

        UPDATE public.estoque SET quantidade = quantidade + v_item.quantidade, updated_at = now()
        WHERE empresa_id = _empresa_id AND produto_id = v_item.produto_id AND vendedor_id = v_vendedor_id;
        
        IF NOT FOUND THEN
            INSERT INTO public.estoque (empresa_id, produto_id, quantidade, vendedor_id)
            VALUES (_empresa_id, v_item.produto_id, v_item.quantidade, v_vendedor_id);
        END IF;
    END LOOP;

    -- Lógica Financeira (Baseada no _tipo_impacto)
    v_valor_para_abater := v_total_devolvido;

    IF _tipo_impacto = 'estoque_apenas' THEN
        v_valor_para_abater := 0; -- Não mexe no financeiro
    
    ELSIF _tipo_impacto = 'auto' THEN
        -- Abater dívidas primeiro
        FOR v_parcela IN SELECT id, valor_total, valor_pago FROM public.parcelas WHERE venda_id = _venda_id AND status IN ('pendente', 'parcial', 'vencida') ORDER BY vencimento DESC LOOP
            EXIT WHEN v_valor_para_abater <= 0;
            DECLARE v_saldo NUMERIC := v_parcela.valor_total - v_parcela.valor_pago; v_abatido NUMERIC;
            BEGIN
                v_abatido := LEAST(v_valor_para_abater, v_saldo);
                UPDATE public.parcelas SET valor_total = valor_total - v_abatido, status = CASE WHEN (valor_pago > 0) THEN 'paga'::status_parcela ELSE 'cancelada'::status_parcela END, updated_at = now() WHERE id = v_parcela.id;
                v_valor_para_abater := v_valor_para_abater - v_abatido;
            END;
        END LOOP;
    END IF;

    -- Gerar Crédito (se sobrar valor ou se for 'total_credito')
    IF v_valor_para_abater > 0 AND _cliente_id IS NOT NULL THEN
        INSERT INTO public.credito_clientes (empresa_id, cliente_id, devolucao_id, valor, tipo, descricao, created_by)
        VALUES (_empresa_id, _cliente_id, v_devolucao_id, v_valor_para_abater, 'entrada', 'Crédito via devolução #' || v_devolucao_id, auth.uid());
    END IF;

    UPDATE public.devolucoes SET impacto_estoque_aplicado = true, impacto_financeiro_aplicado = (_tipo_impacto != 'estoque_apenas') WHERE id = v_devolucao_id;

    RETURN jsonb_build_object('success', true, 'devolucao_id', v_devolucao_id, 'valor_credito_gerado', v_valor_para_abater);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
