-- =============================================================================
-- Migration: Edição Administrativa de Venda Finalizada
-- Permite que ADMIN altere itens e valores de uma venda finalizada (< 30 dias).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_admin_editar_venda_finalizada(
  _venda_id uuid,
  _novos_itens jsonb, -- [{produto_id, quantidade, preco_vendido, desconto, bonus}]
  _novas_observacoes text,
  _usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda RECORD;
  v_empresa_id uuid;
  v_item_antigo RECORD;
  v_item_novo jsonb;
  v_hist_msg text := '';
  v_total_antigo numeric;
  v_subtotal_novo numeric := 0;
  v_desconto_novo numeric := 0;
  v_total_novo numeric := 0;
  v_total_custo_novo numeric := 0;
  v_delta_qty numeric;
  v_produto_id uuid;
  v_total_ja_pago numeric;
  v_total_devido_novo numeric;
  v_excedente numeric;
  v_parcela_id uuid;
  v_valor_parcela numeric;
  v_saldo_abater numeric;
  v_item_id uuid;
BEGIN
  -- 1. VERIFICAÇÕES DE SEGURANÇA
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem editar vendas finalizadas.';
  END IF;

  SELECT * INTO v_venda FROM public.vendas WHERE id = _venda_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada.'; END IF;
  
  IF v_venda.status != 'finalizada' THEN
    RAISE EXCEPTION 'Apenas vendas com status "finalizada" podem ser editadas por este fluxo.';
  END IF;

  IF v_venda.data_venda < (now() - interval '30 days') THEN
    RAISE EXCEPTION 'Venda fora da janela de edição permitida (30 dias).';
  END IF;

  v_empresa_id := v_venda.empresa_id;
  v_total_antigo := v_venda.total;
  v_hist_msg := format('Venda editada por admin em %s.', to_char(now(), 'DD/MM/YYYY HH24:MI'));

  -- 2. PROCESSAR ITENS E CALCULAR TOTAIS NOVOS
  -- Usaremos um loop para calcular o novo total e gerar os ajustes de estoque
  FOR v_item_novo IN SELECT * FROM jsonb_array_elements(_novos_itens)
  LOOP
    v_produto_id := (v_item_novo->>'produto_id')::uuid;
    v_subtotal_novo := v_subtotal_novo + (COALESCE((v_item_novo->>'preco_vendido')::numeric, 0) * (v_item_novo->>'quantidade')::numeric);
    v_desconto_novo := v_desconto_novo + COALESCE((v_item_novo->>'desconto')::numeric, 0);
    v_total_novo := v_total_novo + COALESCE((v_item_novo->>'subtotal')::numeric, 0);
    -- Custo (buscado do produto atual ou mantido, simplificaremos mantendo o custo do produto no DB)
    v_total_custo_novo := v_total_custo_novo + (COALESCE((SELECT custo FROM produtos WHERE id = v_produto_id), 0) * (v_item_novo->>'quantidade')::numeric);
  END LOOP;

  -- 3. AJUSTAR ESTOQUE (DIFF CHECK)
  -- Para cada item original, verificamos se sumiu ou se a quantidade mudou
  FOR v_item_antigo IN SELECT * FROM public.itens_venda WHERE venda_id = _venda_id
  LOOP
    -- Tentar encontrar no novo JSON
    v_item_novo := NULL;
    SELECT i INTO v_item_novo FROM jsonb_array_elements(_novos_itens) i WHERE (i->>'produto_id')::uuid = v_item_antigo.produto_id AND COALESCE((i->>'bonus')::boolean, false) = v_item_antigo.bonus;
    
    IF v_item_novo IS NULL THEN
      -- Item removido da venda: Devolver tudo ao estoque
      INSERT INTO movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes, data)
      VALUES (v_empresa_id, v_item_antigo.produto_id, v_venda.vendedor_id, 'reposicao', v_item_antigo.quantidade, 'Devolução por edição de venda #' || LEFT(_venda_id::text, 8), now());
      
      UPDATE estoque SET quantidade = quantidade + v_item_antigo.quantidade, updated_at = now()
      WHERE empresa_id = v_empresa_id AND produto_id = v_item_antigo.produto_id AND vendedor_id = v_venda.vendedor_id;
      
      v_hist_msg := v_hist_msg || format(' Item removido: %s (Qtd: %s).', v_item_antigo.nome_produto, v_item_antigo.quantidade);
    ELSE
      -- Item persiste: Verificar delta de quantidade
      v_delta_qty := v_item_antigo.quantidade - (v_item_novo->>'quantidade')::numeric;
      
      IF v_delta_qty != 0 THEN
        INSERT INTO movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes, data)
        VALUES (v_empresa_id, v_item_antigo.produto_id, v_venda.vendedor_id, 
                CASE WHEN v_delta_qty > 0 THEN 'reposicao'::tipo_movimento ELSE 'venda'::tipo_movimento END, 
                ABS(v_delta_qty), 
                'Ajuste por edição de venda #' || LEFT(_venda_id::text, 8), now());
        
        UPDATE estoque SET quantidade = quantidade + v_delta_qty, updated_at = now()
        WHERE empresa_id = v_empresa_id AND produto_id = v_item_antigo.produto_id AND vendedor_id = v_venda.vendedor_id;
        
        v_hist_msg := v_hist_msg || format(' Qtd %s: %s -> %s.', v_item_antigo.nome_produto, v_item_antigo.quantidade, v_item_novo->>'quantidade');
      END IF;
    END IF;
  END LOOP;

  -- Para itens novos (que não existiam na venda original)
  FOR v_item_novo IN SELECT * FROM jsonb_array_elements(_novos_itens)
  LOOP
    v_produto_id := (v_item_novo->>'produto_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.itens_venda WHERE venda_id = _venda_id AND produto_id = v_produto_id) THEN
      -- Novo item adicionado
      INSERT INTO movimentos_estoque (empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes, data)
      VALUES (v_empresa_id, v_produto_id, v_venda.vendedor_id, 'venda', (v_item_novo->>'quantidade')::numeric, 'Adição por edição de venda #' || LEFT(_venda_id::text, 8), now());
      
      UPDATE estoque SET quantidade = quantidade - (v_item_novo->>'quantidade')::numeric, updated_at = now()
      WHERE empresa_id = v_empresa_id AND produto_id = v_produto_id AND vendedor_id = v_venda.vendedor_id;
      
      v_hist_msg := v_hist_msg || format(' Item adicionado: %s (Qtd: %s).', v_item_novo->>'nome', v_item_novo->>'quantidade');
    END IF;
  END LOOP;

  -- 4. ATUALIZAR ITENS_VENDA (RECREAR)
  DELETE FROM public.itens_venda WHERE venda_id = _venda_id;
  
  FOR v_item_novo IN SELECT * FROM jsonb_array_elements(_novos_itens)
  LOOP
    INSERT INTO public.itens_venda (venda_id, produto_id, kit_id, item_type, nome_produto, quantidade, preco_original, preco_vendido, desconto, bonus, subtotal, custo_unitario)
    VALUES (
      _venda_id, 
      (v_item_novo->>'produto_id')::uuid, 
      (v_item_novo->>'kit_id')::uuid,
      v_item_novo->>'item_type',
      v_item_novo->>'nome',
      (v_item_novo->>'quantidade')::numeric,
      (v_item_novo->>'preco_original')::numeric,
      (v_item_novo->>'preco_vendido')::numeric,
      (v_item_novo->>'desconto')::numeric,
      (v_item_novo->>'bonus')::boolean,
      (v_item_novo->>'subtotal')::numeric,
      (v_item_novo->>'custo_unitario')::numeric
    );
  END LOOP;

  -- 5. AJUSTAR FINANCEIRO (PARCELAS E CRÉDITO)
  SELECT COALESCE(SUM(valor_pago), 0) INTO v_total_ja_pago FROM public.parcelas WHERE venda_id = _venda_id;
  
  IF v_total_novo < v_total_ja_pago THEN
    -- Venda ficou mais barata que o já pago: Gerar Crédito Casa
    v_excedente := v_total_ja_pago - v_total_novo;
    
    INSERT INTO public.credito_clientes (empresa_id, cliente_id, valor, tipo, descricao, created_by)
    VALUES (v_empresa_id, v_venda.cliente_id, v_excedente, 'entrada', 'Crédito gerado por edição de venda #' || LEFT(_venda_id::text, 8), auth.uid());
    
    -- Marcar parcelas pendentes como pagas ou deletar (já que o total foi superado)
    DELETE FROM public.parcelas WHERE venda_id = _venda_id AND (status = 'pendente' OR status = 'vencida');
    
    v_hist_msg := v_hist_msg || format(' Total: %s -> %s. Excedente de %s gerado como crédito.', v_total_antigo, v_total_novo, v_excedente);
  ELSE
    -- Reajustar as parcelas pendentes para cobrir o novo saldo (v_total_novo - v_total_ja_pago)
    v_saldo_abater := v_total_novo - v_total_ja_pago;
    
    -- Simplificação: Distribuir nas parcelas pendentes existentes
    -- Se não houver pendentes e o valor subiu, criamos uma nova
    IF NOT EXISTS (SELECT 1 FROM public.parcelas WHERE venda_id = _venda_id AND (status = 'pendente' OR status = 'vencida')) AND v_saldo_abater > 0 THEN
       INSERT INTO public.parcelas (empresa_id, venda_id, cliente_id, numero, valor_total, valor_pago, vencimento, forma_pagamento)
       VALUES (v_empresa_id, _venda_id, v_venda.cliente_id, (SELECT COALESCE(MAX(numero),0)+1 FROM parcelas WHERE venda_id=_venda_id), v_saldo_abater, 0, now() + interval '30 days', 'crediario');
    ELSE
       -- Distribuir o novo saldo nas abertas (proporcionalmente ou na última)
       -- Aqui vamos apenas atualizar o valor_total das abertas para que a soma bata com v_saldo_abater
       UPDATE public.parcelas SET valor_total = v_saldo_abater / (SELECT count(*) FROM parcelas WHERE venda_id = _venda_id AND status IN ('pendente','vencida')), updated_at = now()
       WHERE venda_id = _venda_id AND status IN ('pendente','vencida');
    END IF;
    
    v_hist_msg := v_hist_msg || format(' Total: %s -> %s.', v_total_antigo, v_total_novo);
  END IF;

  -- 6. ATUALIZAR VENDA
  UPDATE public.vendas
  SET subtotal = v_subtotal_novo,
      desconto_total = v_desconto_novo,
      total = v_total_novo,
      total_cost = v_total_custo_novo,
      total_profit = v_total_novo - v_total_custo_novo,
      observacoes = COALESCE(_novas_observacoes, '') || E'\n\n[ADMIN] ' || v_hist_msg,
      updated_at = now()
  WHERE id = _venda_id;

  -- 7. AUDIT LOG (Handled via trg_audit_vendas, but we can add an extra specific log)
  INSERT INTO public.audit_logs (empresa_id, usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos)
  VALUES (v_empresa_id, auth.uid(), 'admin_edit', 'vendas', _venda_id::text, jsonb_build_object('total', v_total_antigo), jsonb_build_object('total', v_total_novo, 'obs', v_hist_msg));

  RETURN jsonb_build_object('success', true, 'venda_id', _venda_id, 'novo_total', v_total_novo);
END;
$$;
