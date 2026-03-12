-- 1) Índice único: clientes por telefone + empresa (evita duplicação)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_telefone_empresa 
ON public.clientes (empresa_id, telefone) 
WHERE telefone != '';

-- 2) Índice único: produtos por código + empresa (evita duplicação)
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo_empresa 
ON public.produtos (empresa_id, codigo) 
WHERE codigo != '';

-- 3) Trigger: validar pagamento não excede saldo da parcela
CREATE OR REPLACE FUNCTION public.fn_validar_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valor_total NUMERIC;
  _total_pago NUMERIC;
BEGIN
  SELECT valor_total INTO _valor_total FROM public.parcelas WHERE id = NEW.parcela_id;
  
  IF _valor_total IS NULL THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  SELECT COALESCE(SUM(valor_pago), 0) INTO _total_pago
  FROM public.pagamentos
  WHERE parcela_id = NEW.parcela_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (_total_pago + NEW.valor_pago) > (_valor_total * 1.001) THEN
    RAISE EXCEPTION 'Pagamento excede o valor da parcela. Valor restante: R$ %', ROUND(_valor_total - _total_pago, 2);
  END IF;

  IF NEW.valor_pago <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser positivo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_pagamento ON public.pagamentos;
CREATE TRIGGER trg_validar_pagamento
BEFORE INSERT ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_pagamento();

-- 4) Trigger: sincronizar total da venda com soma dos itens
CREATE OR REPLACE FUNCTION public.fn_sync_venda_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _venda_id uuid;
  _soma NUMERIC;
BEGIN
  _venda_id := COALESCE(NEW.venda_id, OLD.venda_id);

  SELECT COALESCE(SUM(subtotal), 0) INTO _soma
  FROM public.itens_venda
  WHERE venda_id = _venda_id;

  UPDATE public.vendas
  SET total = _soma, updated_at = now()
  WHERE id = _venda_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_venda_total ON public.itens_venda;
CREATE TRIGGER trg_sync_venda_total
AFTER INSERT OR UPDATE OR DELETE ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_venda_total();

-- 5) Índices de performance
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.vendas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_id ON public.vendas (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda (venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON public.itens_venda (produto_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_venda_id ON public.parcelas (venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cliente_id ON public.parcelas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_parcela_id ON public.pagamentos (parcela_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_estoque_produto_id ON public.movimentos_estoque (produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_produto_vendedor ON public.estoque (produto_id, vendedor_id)