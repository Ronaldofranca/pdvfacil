
-- Rebuild RPC: pre-compute total_cost/total_profit from items JSON BEFORE inserting venda
-- This eliminates the separate UPDATE that triggered the protection conflict
CREATE OR REPLACE FUNCTION public.fn_finalizar_venda_atomica(
  _idempotency_key text, _empresa_id uuid, _cliente_id uuid, _vendedor_id uuid,
  _subtotal numeric, _desconto_total numeric, _total numeric, _pagamentos jsonb,
  _observacoes text, _data_venda timestamp with time zone, _itens jsonb,
  _crediario jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing_venda_id uuid;
  _venda_id uuid;
  _item jsonb;
  _ki jsonb;
  _real_kit_id uuid;
  _produto_id_for_db uuid;
  _has_crediario boolean;
  _entrada numeric;
  _num_parcelas int;
  _primeiro_vencimento date;
  _valor_restante numeric;
  _valor_parcela numeric;
  _resto numeric;
  _venc date;
  _valor numeric;
  _item_cost numeric;
  _item_subtotal numeric;
  _item_qty numeric;
  _computed_total_cost numeric := 0;
  _computed_total_profit numeric := 0;
BEGIN
  -- IDEMPOTENCY CHECK
  SELECT id INTO _existing_venda_id FROM public.vendas WHERE idempotency_key = _idempotency_key;
  IF _existing_venda_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', _existing_venda_id, 'already_processed', true, 'status', 'finalizada');
  END IF;

  -- PRE-COMPUTE total_cost and total_profit from items JSON (before any INSERT)
  FOR _item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    _item_cost := COALESCE((_item->>'custo_unitario')::numeric, 0);
    _item_subtotal := COALESCE((_item->>'subtotal')::numeric, 0);
    _item_qty := COALESCE((_item->>'quantidade')::numeric, 0);
    _computed_total_cost := _computed_total_cost + (_item_cost * _item_qty);
    _computed_total_profit := _computed_total_profit + (_item_subtotal - _item_cost * _item_qty);
  END LOOP;

  -- 1. Create venda with ALL computed fields set immediately (no separate UPDATE needed)
  INSERT INTO public.vendas (empresa_id, cliente_id, vendedor_id, status, subtotal, desconto_total, total, pagamentos, observacoes, data_venda, idempotency_key, total_cost, total_profit)
  VALUES (_empresa_id, _cliente_id, _vendedor_id, 'finalizada', _subtotal, _desconto_total, _total, _pagamentos, COALESCE(_observacoes, ''), _data_venda, _idempotency_key, _computed_total_cost, _computed_total_profit)
  RETURNING id INTO _venda_id;

  -- 2. Insert sale items
  FOR _item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    _produto_id_for_db := (_item->>'produto_id')::uuid;
    _real_kit_id := NULL;
    
    IF (_item->>'is_kit')::boolean = true AND jsonb_array_length(COALESCE(_item->'kit_itens', '[]'::jsonb)) > 0 THEN
      _produto_id_for_db := (_item->'kit_itens'->0->>'produto_id')::uuid;
      _real_kit_id := (_item->>'real_kit_id')::uuid;
    END IF;

    _item_cost := COALESCE((_item->>'custo_unitario')::numeric, 0);
    _item_subtotal := COALESCE((_item->>'subtotal')::numeric, 0);
    _item_qty := COALESCE((_item->>'quantidade')::numeric, 0);

    INSERT INTO public.itens_venda (venda_id, produto_id, kit_id, item_type, nome_produto, quantidade, preco_original, preco_vendido, desconto, bonus, subtotal, custo_unitario)
    VALUES (
      _venda_id, _produto_id_for_db, _real_kit_id,
      CASE WHEN (_item->>'is_kit')::boolean = true THEN 'kit' ELSE 'produto' END,
      _item->>'nome', _item_qty, (_item->>'preco_original')::numeric, (_item->>'preco_vendido')::numeric,
      (_item->>'desconto')::numeric, COALESCE((_item->>'bonus')::boolean, false), _item_subtotal, _item_cost
    );

    -- 3. Stock movements
    IF _item_qty > 0 THEN
      IF (_item->>'is_kit')::boolean = true AND jsonb_array_length(COALESCE(_item->'kit_itens', '[]'::jsonb)) > 0 THEN
        FOR _ki IN SELECT * FROM jsonb_array_elements(_item->'kit_itens')
        LOOP
          INSERT INTO public.movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes, kit_id)
          VALUES (_empresa_id, (_ki->>'produto_id')::uuid, _vendedor_id, 'venda',
                  (_ki->>'quantidade')::numeric * _item_qty,
                  format('Venda #%s (Kit: %s)', substr(_venda_id::text, 1, 8), _item->>'nome'), _real_kit_id);
        END LOOP;
      ELSE
        INSERT INTO public.movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes)
        VALUES (_empresa_id, (_item->>'produto_id')::uuid, _vendedor_id, 'venda', _item_qty,
                format('Venda #%s', substr(_venda_id::text, 1, 8)));
      END IF;
    END IF;
  END LOOP;

  -- 4. Generate installments if crediário
  _has_crediario := EXISTS (SELECT 1 FROM jsonb_array_elements(_pagamentos) p WHERE p->>'forma' = 'crediario');
  
  IF _has_crediario AND _crediario IS NOT NULL AND (_crediario->>'num_parcelas')::int > 0 THEN
    _entrada := COALESCE((_crediario->>'entrada')::numeric, 0);
    _num_parcelas := (_crediario->>'num_parcelas')::int;
    _primeiro_vencimento := (_crediario->>'primeiro_vencimento')::date;
    _valor_restante := _total - _entrada;

    IF _valor_restante > 0 THEN
      _valor_parcela := trunc(_valor_restante / _num_parcelas * 100) / 100;
      _resto := round((_valor_restante - _valor_parcela * _num_parcelas) * 100) / 100;

      FOR i IN 0..(_num_parcelas - 1) LOOP
        _venc := _primeiro_vencimento + (i || ' months')::interval;
        _valor := CASE WHEN i = 0 THEN _valor_parcela + _resto ELSE _valor_parcela END;
        INSERT INTO public.parcelas (empresa_id, venda_id, cliente_id, numero, valor_total, valor_pago, vencimento, forma_pagamento)
        VALUES (_empresa_id, _venda_id, _cliente_id, i + 1, _valor, 0, _venc, 'crediario');
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object('id', _venda_id, 'already_processed', false, 'status', 'finalizada');
END;
$function$;
