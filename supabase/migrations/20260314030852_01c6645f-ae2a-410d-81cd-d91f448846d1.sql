
-- Atomic cancellation function
CREATE OR REPLACE FUNCTION public.fn_cancelar_venda(
  _venda_id uuid,
  _motivo text,
  _usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _venda RECORD;
  _item RECORD;
  _parcela RECORD;
  _parcelas_canceladas int := 0;
  _parcelas_com_pagamento int := 0;
  _valor_pago_total numeric := 0;
  _estornos_estoque int := 0;
  _kit_itens RECORD;
BEGIN
  -- 1. Validate venda exists and is not already cancelled
  SELECT * INTO _venda FROM public.vendas WHERE id = _venda_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;
  
  IF _venda.status = 'cancelada' THEN
    RAISE EXCEPTION 'Esta venda já está cancelada';
  END IF;
  
  IF _venda.status NOT IN ('finalizada', 'pendente', 'rascunho') THEN
    RAISE EXCEPTION 'Status da venda não permite cancelamento: %', _venda.status;
  END IF;

  -- 2. Mark venda as cancelled
  UPDATE public.vendas
  SET status = 'cancelada',
      motivo_cancelamento = _motivo,
      cancelado_por = _usuario_id,
      cancelado_em = now(),
      updated_at = now()
  WHERE id = _venda_id;

  -- 3. Handle parcelas
  FOR _parcela IN
    SELECT id, status, valor_pago, valor_total
    FROM public.parcelas
    WHERE venda_id = _venda_id
  LOOP
    IF _parcela.status = 'paga' OR _parcela.valor_pago > 0 THEN
      -- Parcela with payments: mark as estornada, keep payment history
      _parcelas_com_pagamento := _parcelas_com_pagamento + 1;
      _valor_pago_total := _valor_pago_total + _parcela.valor_pago;
      UPDATE public.parcelas
      SET status = 'cancelada',
          observacoes = format('ESTORNO - Cancelamento venda #%s. Valor já pago: R$ %s. Motivo: %s',
            left(_venda_id::text, 8), to_char(_parcela.valor_pago, 'FM999G999D00'), _motivo),
          updated_at = now()
      WHERE id = _parcela.id;
    ELSE
      -- Unpaid parcela: simply cancel
      UPDATE public.parcelas
      SET status = 'cancelada',
          observacoes = format('Cancelada - venda #%s cancelada. Motivo: %s', left(_venda_id::text, 8), _motivo),
          updated_at = now()
      WHERE id = _parcela.id;
    END IF;
    _parcelas_canceladas := _parcelas_canceladas + 1;
  END LOOP;

  -- 4. Estorno de estoque - generate reverse movements
  FOR _item IN
    SELECT produto_id, quantidade, kit_id, nome_produto, item_type
    FROM public.itens_venda
    WHERE venda_id = _venda_id
  LOOP
    IF _item.item_type = 'kit' AND _item.kit_id IS NOT NULL THEN
      -- Kit: reverse each component
      FOR _kit_itens IN
        SELECT ki.produto_id, ki.quantidade
        FROM public.kit_itens ki
        WHERE ki.kit_id = _item.kit_id
      LOOP
        INSERT INTO public.movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes)
        VALUES (
          _venda.empresa_id,
          _kit_itens.produto_id,
          _venda.vendedor_id,
          'ajuste',
          _kit_itens.quantidade * _item.quantidade,
          format('Estorno Kit "%s" - Cancelamento venda #%s', _item.nome_produto, left(_venda_id::text, 8))
        );
        _estornos_estoque := _estornos_estoque + 1;
      END LOOP;
    ELSE
      -- Regular product: reverse
      INSERT INTO public.movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes)
      VALUES (
        _venda.empresa_id,
        _item.produto_id,
        _venda.vendedor_id,
        'ajuste',
        _item.quantidade,
        format('Estorno - Cancelamento venda #%s (%s)', left(_venda_id::text, 8), _item.nome_produto)
      );
      _estornos_estoque := _estornos_estoque + 1;
    END IF;
  END LOOP;

  -- 5. Audit log
  INSERT INTO public.audit_logs (empresa_id, usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos)
  VALUES (
    _venda.empresa_id,
    _usuario_id,
    'CANCELAMENTO',
    'vendas',
    _venda_id::text,
    jsonb_build_object(
      'status', _venda.status,
      'total', _venda.total,
      'cliente_id', _venda.cliente_id
    ),
    jsonb_build_object(
      'status', 'cancelada',
      'motivo', _motivo,
      'parcelas_canceladas', _parcelas_canceladas,
      'parcelas_com_pagamento', _parcelas_com_pagamento,
      'valor_ja_pago', _valor_pago_total,
      'estornos_estoque', _estornos_estoque
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'parcelas_canceladas', _parcelas_canceladas,
    'parcelas_com_pagamento', _parcelas_com_pagamento,
    'valor_ja_pago', _valor_pago_total,
    'estornos_estoque', _estornos_estoque
  );
END;
$$;
