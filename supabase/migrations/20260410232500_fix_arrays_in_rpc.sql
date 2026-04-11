-- =============================================================================
-- Migration: Tornar fn_finalizar_venda_atomica resiliente a strings JSON
-- Preservando a inserção correta na tabela de movimentos_estoque.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_finalizar_venda_atomica(
  _idempotency_key text,
  _empresa_id uuid,
  _cliente_id uuid,
  _vendedor_id uuid,
  _subtotal numeric,
  _desconto_total numeric,
  _total numeric,
  _pagamentos jsonb,
  _observacoes text,
  _data_venda timestamp with time zone,
  _itens jsonb,
  _crediario jsonb DEFAULT NULL::jsonb,
  _is_retroativa boolean DEFAULT false,
  _device_id uuid DEFAULT NULL,
  _offline_at timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing_venda_id uuid;
  _venda_id          uuid;
  _item              jsonb;
  _ki                jsonb;
  _pag               jsonb;
  _real_kit_id       uuid;
  _produto_id_for_db uuid;
  _produto_id_text   text;
  _has_crediario     boolean;
  _entrada           numeric;
  _num_parcelas      int;
  _primeiro_vencimento date;
  _valor_restante    numeric;
  _valor_parcela     numeric;
  _resto             numeric;
  _venc              date;
  _valor             numeric;
  _item_cost         numeric;
  _item_subtotal     numeric;
  _item_qty          numeric;
  _computed_total_cost   numeric := 0;
  _computed_total_profit numeric := 0;
  _saldo_credito     numeric := 0;
  _valor_credito_usado numeric := 0;
BEGIN
  -- ── FIX: DESCOMPACTAR JSON ARRAYS ─────────────────────────────────────────
  IF jsonb_typeof(_itens) = 'string' THEN
    _itens := (_itens#>>'{}')::jsonb;
  END IF;

  IF jsonb_typeof(_pagamentos) = 'string' THEN
    _pagamentos := (_pagamentos#>>'{}')::jsonb;
  END IF;

  IF jsonb_typeof(_crediario) = 'string' THEN
    _crediario := (_crediario#>>'{}')::jsonb;
  END IF;

  -- ── IDEMPOTENCY CHECK ─────────────────────────────────────────────────────
  IF _idempotency_key IS NOT NULL AND _idempotency_key <> '' THEN
    SELECT id INTO _existing_venda_id
    FROM public.vendas
    WHERE idempotency_key = _idempotency_key;

    IF _existing_venda_id IS NOT NULL THEN
      -- Registrar log de sucesso (item já existia)
      INSERT INTO public.sync_logs (empresa_id, vendedor_id, device_id, table_name, operation, idempotency_key, status, payload)
      VALUES (_empresa_id, _vendedor_id, _device_id, 'vendas', 'rpc:finalizar_venda', _idempotency_key, 'success', jsonb_build_object('already_processed', true));

      RETURN jsonb_build_object(
        'id', _existing_venda_id,
        'already_processed', true,
        'status', 'finalizada'
      );
    END IF;
  END IF;

  -- ── 0. VALIDAR ITENS ──────────────────────────────────────────────────────
  IF _itens IS NULL OR jsonb_array_length(_itens) = 0 THEN
    RAISE EXCEPTION 'A venda deve conter pelo menos um item.';
  END IF;

  -- ── 0. PRÉ-COMPUTAR custo/lucro ───────────────────────────────────────────
  FOR _item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    _item_cost    := COALESCE((_item->>'custo_unitario')::numeric, 0);
    _item_subtotal := COALESCE((_item->>'subtotal')::numeric, 0);
    _item_qty     := COALESCE((_item->>'quantidade')::numeric, 0);
    _computed_total_cost   := _computed_total_cost   + (_item_cost * _item_qty);
    _computed_total_profit := _computed_total_profit + (_item_subtotal - _item_cost * _item_qty);
  END LOOP;

  -- ── 0b. VERIFICAR E CONSUMIR CRÉDITO CASA ─────────────────────────────────
  FOR _pag IN SELECT * FROM jsonb_array_elements(_pagamentos)
  LOOP
    IF (_pag->>'forma') = 'credito_casa' THEN
      _valor_credito_usado := (_pag->>'valor')::numeric;

      SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
      INTO _saldo_credito
      FROM public.credito_clientes
      WHERE cliente_id = _cliente_id AND empresa_id = _empresa_id;

      IF _saldo_credito < _valor_credito_usado THEN
        RAISE EXCEPTION 'Saldo de Crédito Casa insuficiente (Disponível: R$ %)', _saldo_credito;
      END IF;
    END IF;
  END LOOP;

  -- ── 1. CRIAR VENDA ────────────────────────────────────────────────────────
  INSERT INTO public.vendas (
    empresa_id, cliente_id, vendedor_id, status,
    subtotal, desconto_total, total,
    pagamentos, observacoes, data_venda, idempotency_key,
    total_cost, total_profit, is_retroativa,
    device_id, offline_at
  )
  VALUES (
    _empresa_id, _cliente_id, _vendedor_id, 'finalizada',
    _subtotal, _desconto_total, _total,
    _pagamentos, COALESCE(_observacoes, ''), COALESCE(_data_venda, now()), _idempotency_key,
    _computed_total_cost, _computed_total_profit, _is_retroativa,
    _device_id, _offline_at
  )
  RETURNING id INTO _venda_id;

  -- ── 2. CONSUMIR CRÉDITO CASA (post-venda para ter referência) ─────────────
  IF _valor_credito_usado > 0 THEN
    INSERT INTO public.credito_clientes (
      empresa_id, cliente_id, valor, tipo, descricao, created_by
    ) VALUES (
      _empresa_id, _cliente_id, _valor_credito_usado, 'saida',
      'Uso de Crédito Casa na Venda #' || substr(_venda_id::text, 1, 8),
      auth.uid()
    );
  END IF;

  -- ── 3. INSERIR ITENS DA VENDA ─────────────────────────────────────────────
  PERFORM set_config('app.finalizar_venda_atomica', 'on', true);

  FOR _item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    _real_kit_id := NULL;
    _produto_id_text := NULL;
    _produto_id_for_db := NULL;

    IF COALESCE((_item->>'is_kit')::boolean, false) = true
       AND jsonb_array_length(COALESCE(_item->'kit_itens', '[]'::jsonb)) > 0
    THEN
      _produto_id_text := _item->'kit_itens'->0->>'produto_id';
      IF _produto_id_text IS NOT NULL AND _produto_id_text <> '' THEN
        _produto_id_for_db := _produto_id_text::uuid;
      END IF;
      
      _produto_id_text := _item->>'real_kit_id';
      IF _produto_id_text IS NOT NULL AND _produto_id_text <> '' THEN
        _real_kit_id := _produto_id_text::uuid;
      END IF;
    ELSE
      _produto_id_text := _item->>'produto_id';
      IF _produto_id_text IS NOT NULL AND _produto_id_text <> '' THEN
        IF _produto_id_text LIKE 'kit_%' THEN
          _produto_id_text := substring(_produto_id_text FROM 5);
        END IF;
        IF _produto_id_text <> '' THEN
          _produto_id_for_db := _produto_id_text::uuid;
        END IF;
      END IF;
    END IF;

    IF _produto_id_for_db IS NULL THEN
      RAISE EXCEPTION 'Item da venda sem produto_id válido: %', _item->>'nome';
    END IF;

    _item_cost     := COALESCE((_item->>'custo_unitario')::numeric, 0);
    _item_subtotal := COALESCE((_item->>'subtotal')::numeric, 0);
    _item_qty      := COALESCE((_item->>'quantidade')::numeric, 0);

    INSERT INTO public.itens_venda (
      venda_id, produto_id, kit_id, item_type, nome_produto,
      quantidade, preco_original, preco_vendido, desconto, bonus,
      subtotal, custo_unitario
    )
    VALUES (
      _venda_id, _produto_id_for_db, _real_kit_id,
      CASE
        WHEN COALESCE((_item->>'is_kit')::boolean, false) = true THEN 'kit'
        ELSE 'produto'
      END,
      COALESCE(_item->>'nome', 'Produto sem nome'),
      _item_qty,
      COALESCE((_item->>'preco_original')::numeric, 0),
      COALESCE((_item->>'preco_vendido')::numeric, 0),
      COALESCE((_item->>'desconto')::numeric, 0),
      COALESCE((_item->>'bonus')::boolean, false),
      _item_subtotal,
      _item_cost
    );

    -- ── 4. MOVIMENTOS DE ESTOQUE ───────────────────────────────────────────
    IF _item_qty > 0 THEN
      IF COALESCE((_item->>'is_kit')::boolean, false) = true
         AND jsonb_array_length(COALESCE(_item->'kit_itens', '[]'::jsonb)) > 0
      THEN
        FOR _ki IN SELECT * FROM jsonb_array_elements(_item->'kit_itens')
        LOOP
          _produto_id_text := _ki->>'produto_id';
          IF _produto_id_text IS NOT NULL AND _produto_id_text <> '' THEN
            INSERT INTO public.movimentos_estoque (
              empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes, kit_id, data
            )
            VALUES (
              _empresa_id,
              _produto_id_text::uuid,
              _vendedor_id,
              'venda',
              COALESCE((_ki->>'quantidade')::numeric, 0) * _item_qty,
              format('Venda #%s (Kit: %s)', substr(_venda_id::text, 1, 8), COALESCE(_item->>'nome', 'Kit')),
              _real_kit_id,
              COALESCE(_data_venda, now())
            );
          END IF;
        END LOOP;
      ELSE
        INSERT INTO public.movimentos_estoque (
          empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes, data
        )
        VALUES (
          _empresa_id,
          _produto_id_for_db,
          _vendedor_id,
          'venda',
          _item_qty,
          format('Venda #%s', substr(_venda_id::text, 1, 8)),
          COALESCE(_data_venda, now())
        );
      END IF;
    END IF;
  END LOOP;

  PERFORM set_config('app.finalizar_venda_atomica', 'off', true);

  -- ── 5. GERAR PARCELAS (se crediário) ──────────────────────────────────────
  _has_crediario := EXISTS (
    SELECT 1 FROM jsonb_array_elements(_pagamentos) p
    WHERE lower(p->>'forma') IN ('crediario', 'crediário')
  );

  IF _has_crediario AND _crediario IS NOT NULL
     AND (_crediario->>'num_parcelas')::int > 0
  THEN
    _entrada             := COALESCE((_crediario->>'entrada')::numeric, 0);
    _num_parcelas        := (_crediario->>'num_parcelas')::int;
    _primeiro_vencimento := (_crediario->>'primeiro_vencimento')::date;
    IF _primeiro_vencimento IS NULL THEN
      _primeiro_vencimento := current_date;
    END IF;

    _valor_restante      := _total - _entrada;

    IF _valor_restante > 0 THEN
      _valor_parcela := trunc(_valor_restante / _num_parcelas * 100) / 100;
      _resto         := round((_valor_restante - _valor_parcela * _num_parcelas) * 100) / 100;

      FOR i IN 0..(_num_parcelas - 1)
      LOOP
        _venc  := (_primeiro_vencimento + (i || ' months')::interval)::date;
        _valor := CASE WHEN i = 0 THEN _valor_parcela + _resto ELSE _valor_parcela END;

        INSERT INTO public.parcelas (
          empresa_id, venda_id, cliente_id,
          numero, valor_total, valor_pago,
          vencimento, forma_pagamento
        )
        VALUES (
          _empresa_id, _venda_id, COALESCE(_cliente_id, NULL),
          i + 1, _valor, 0,
          _venc, 'crediario'
        );
      END LOOP;
    END IF;
  END IF;

  -- Registrar log de sucesso
  INSERT INTO public.sync_logs (empresa_id, vendedor_id, device_id, table_name, operation, idempotency_key, status)
  VALUES (_empresa_id, _vendedor_id, _device_id, 'vendas', 'rpc:finalizar_venda', _idempotency_key, 'success');

  RETURN jsonb_build_object(
    'id', _venda_id,
    'already_processed', false,
    'status', 'finalizada'
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.sync_logs (empresa_id, vendedor_id, device_id, table_name, operation, idempotency_key, status, error_message)
  VALUES (_empresa_id, _vendedor_id, _device_id, 'vendas', 'rpc:finalizar_venda', _idempotency_key, 'error', SQLERRM);
  PERFORM set_config('app.finalizar_venda_atomica', 'off', true);
  RAISE;
END;
$function$;
