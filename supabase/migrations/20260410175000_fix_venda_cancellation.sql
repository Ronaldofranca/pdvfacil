-- =============================================================================
-- Migration: Correção de Cancelamento de Venda
-- Corrigi violação de constraint no financial_ledger e tipo no estoque.
-- =============================================================================

-- 1. ADICIONAR 'estorno' AO ENUM DE MOVIMENTAÇÃO DE ESTOQUE
-- Nota: ALTER TYPE ADD VALUE não pode ser executado dentro de uma transação 
-- em algumas versões do Postgres, mas como migrations do Supabase podem rodar fora,
-- tentaremos garantir que o valor exista.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'tipo_movimento' AND e.enumlabel = 'estorno') THEN
        ALTER TYPE public.tipo_movimento ADD VALUE 'estorno';
    END IF;
END $$;

-- 2. CORRIGIR A FUNÇÃO DE CANCELAMENTO
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

  -- Ledger entry: FIX NATUREZA ('debito' instead of 'estorno')
  INSERT INTO financial_ledger (empresa_id, tipo_evento, natureza, valor, venda_id, descricao, created_by, referencia_tipo)
  VALUES (v_venda.empresa_id, 'cancelamento_venda', 'debito', v_venda.total, _venda_id,
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
