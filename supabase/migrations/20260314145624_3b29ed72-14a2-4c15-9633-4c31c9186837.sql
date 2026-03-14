
-- =============================================
-- FIX 1: financial_ledger — change ledger_client_block to RESTRICTIVE
-- =============================================
DROP POLICY IF EXISTS "ledger_client_block" ON public.financial_ledger;
CREATE POLICY "ledger_client_block" ON public.financial_ledger
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT is_cliente());

-- =============================================
-- FIX 2: financial_integrity_logs — add client block policies
-- =============================================
CREATE POLICY "financial_integrity_logs_client_block_select" ON public.financial_integrity_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT is_cliente());

CREATE POLICY "financial_integrity_logs_client_block_insert" ON public.financial_integrity_logs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_cliente());

-- =============================================
-- FIX 3: fraud_detection_logs — change fraud_client_block to RESTRICTIVE
-- =============================================
DROP POLICY IF EXISTS "fraud_client_block" ON public.fraud_detection_logs;
CREATE POLICY "fraud_client_block" ON public.fraud_detection_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT is_cliente());

-- =============================================
-- FIX 4: fn_cancelar_venda — add admin check
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_cancelar_venda(
  _venda_id uuid,
  _motivo text,
  _usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda RECORD;
  v_parcelas_canceladas int := 0;
  v_parcelas_com_pagamento int := 0;
  v_valor_ja_pago numeric := 0;
  v_estornos int := 0;
  v_item RECORD;
BEGIN
  -- Verify caller is the authenticated user and is admin
  IF auth.uid() IS NULL OR auth.uid() != _usuario_id THEN
    RAISE EXCEPTION 'Não autorizado: usuário inválido';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem cancelar vendas';
  END IF;

  -- Lock the venda row
  SELECT * INTO v_venda
  FROM vendas
  WHERE id = _venda_id
    AND empresa_id = get_my_empresa_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;

  IF v_venda.status = 'cancelada' THEN
    RAISE EXCEPTION 'Venda já está cancelada';
  END IF;

  -- Update venda status
  UPDATE vendas
  SET status = 'cancelada',
      observacoes = COALESCE(observacoes, '') || E'\n[CANCELADA] ' || _motivo,
      updated_at = now()
  WHERE id = _venda_id;

  -- Cancel pending parcelas, preserve paid ones
  UPDATE parcelas
  SET status = 'cancelada',
      updated_at = now()
  WHERE venda_id = _venda_id
    AND status IN ('pendente', 'vencida');
  GET DIAGNOSTICS v_parcelas_canceladas = ROW_COUNT;

  -- Count parcelas with payments
  SELECT COUNT(*), COALESCE(SUM(valor_pago), 0)
  INTO v_parcelas_com_pagamento, v_valor_ja_pago
  FROM parcelas
  WHERE venda_id = _venda_id
    AND valor_pago > 0;

  -- Reverse stock movements
  FOR v_item IN
    SELECT iv.produto_id, iv.quantidade, iv.kit_id, iv.item_type, iv.nome_produto,
           k.id as real_kit_id
    FROM itens_venda iv
    LEFT JOIN kits k ON k.id = iv.kit_id
    WHERE iv.venda_id = _venda_id
  LOOP
    IF v_item.item_type = 'kit' AND v_item.real_kit_id IS NOT NULL THEN
      -- Reverse kit component movements
      INSERT INTO movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes, kit_id)
      SELECT v_venda.empresa_id, ki.produto_id, v_venda.vendedor_id, 'estorno',
             ki.quantidade * v_item.quantidade,
             'Estorno cancelamento venda #' || LEFT(_venda_id::text, 8) || ' (Kit: ' || v_item.nome_produto || ')',
             v_item.real_kit_id
      FROM kit_itens ki
      WHERE ki.kit_id = v_item.real_kit_id;

      -- Update stock for each kit component
      UPDATE estoque e
      SET quantidade = e.quantidade + (ki.quantidade * v_item.quantidade),
          updated_at = now()
      FROM kit_itens ki
      WHERE ki.kit_id = v_item.real_kit_id
        AND e.produto_id = ki.produto_id
        AND e.vendedor_id = v_venda.vendedor_id
        AND e.empresa_id = v_venda.empresa_id;

      v_estornos := v_estornos + 1;
    ELSE
      -- Reverse single product movement
      INSERT INTO movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes)
      VALUES (v_venda.empresa_id, v_item.produto_id, v_venda.vendedor_id, 'estorno',
              v_item.quantidade,
              'Estorno cancelamento venda #' || LEFT(_venda_id::text, 8));

      UPDATE estoque
      SET quantidade = quantidade + v_item.quantidade,
          updated_at = now()
      WHERE produto_id = v_item.produto_id
        AND vendedor_id = v_venda.vendedor_id
        AND empresa_id = v_venda.empresa_id;

      v_estornos := v_estornos + 1;
    END IF;
  END LOOP;

  -- Audit log
  INSERT INTO audit_logs (empresa_id, usuario_id, acao, tabela, registro_id, dados_novos)
  VALUES (v_venda.empresa_id, _usuario_id, 'cancelamento', 'vendas', _venda_id::text,
          jsonb_build_object('motivo', _motivo, 'parcelas_canceladas', v_parcelas_canceladas,
                             'estornos_estoque', v_estornos, 'valor_ja_pago', v_valor_ja_pago));

  -- Ledger entry
  INSERT INTO financial_ledger (empresa_id, tipo_evento, natureza, valor, venda_id, descricao, created_by, referencia_tipo)
  VALUES (v_venda.empresa_id, 'cancelamento_venda', 'estorno', v_venda.total, _venda_id,
          'Cancelamento: ' || _motivo, _usuario_id, 'venda');

  RETURN jsonb_build_object(
    'success', true,
    'parcelas_canceladas', v_parcelas_canceladas,
    'parcelas_com_pagamento', v_parcelas_com_pagamento,
    'valor_ja_pago', v_valor_ja_pago,
    'estornos_estoque', v_estornos
  );
END;
$$;
