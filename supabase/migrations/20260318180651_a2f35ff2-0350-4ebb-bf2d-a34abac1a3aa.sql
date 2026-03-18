
-- Add entrada_reposicao to tipo_movimento enum
ALTER TYPE public.tipo_movimento ADD VALUE IF NOT EXISTS 'entrada_reposicao';
ALTER TYPE public.tipo_movimento ADD VALUE IF NOT EXISTS 'estorno';

-- Create pedidos_reposicao table
CREATE TABLE public.pedidos_reposicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  numero serial,
  fornecedor_nome text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho',
  observacoes text NOT NULL DEFAULT '',
  total_itens integer NOT NULL DEFAULT 0,
  total_valor numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  data_finalizacao timestamptz NULL,
  data_recebimento timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create itens_pedido_reposicao table
CREATE TABLE public.itens_pedido_reposicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_reposicao_id uuid NOT NULL REFERENCES public.pedidos_reposicao(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade_solicitada numeric NOT NULL DEFAULT 0,
  quantidade_recebida numeric NOT NULL DEFAULT 0,
  custo_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedidos_reposicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido_reposicao ENABLE ROW LEVEL SECURITY;

-- RLS for pedidos_reposicao
CREATE POLICY "pedidos_reposicao_select" ON public.pedidos_reposicao
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "pedidos_reposicao_insert" ON public.pedidos_reposicao
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "pedidos_reposicao_update" ON public.pedidos_reposicao
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "pedidos_reposicao_delete" ON public.pedidos_reposicao
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND status = 'rascunho');

-- RLS for itens_pedido_reposicao
CREATE POLICY "itens_pedido_reposicao_select" ON public.itens_pedido_reposicao
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "itens_pedido_reposicao_insert" ON public.itens_pedido_reposicao
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "itens_pedido_reposicao_update" ON public.itens_pedido_reposicao
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "itens_pedido_reposicao_delete" ON public.itens_pedido_reposicao
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

-- Trigger to update totals on pedido when items change
CREATE OR REPLACE FUNCTION public.fn_sync_pedido_reposicao_totais()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pedido_id uuid;
  _total_itens integer;
  _total_valor numeric;
BEGIN
  _pedido_id := COALESCE(NEW.pedido_reposicao_id, OLD.pedido_reposicao_id);

  SELECT COUNT(*), COALESCE(SUM(subtotal), 0)
  INTO _total_itens, _total_valor
  FROM public.itens_pedido_reposicao
  WHERE pedido_reposicao_id = _pedido_id;

  UPDATE public.pedidos_reposicao
  SET total_itens = _total_itens,
      total_valor = _total_valor,
      updated_at = now()
  WHERE id = _pedido_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_pedido_reposicao_totais
AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido_reposicao
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_pedido_reposicao_totais();

-- RPC to confirm receipt (atomic: updates stock + marks received)
CREATE OR REPLACE FUNCTION public.fn_confirmar_recebimento_reposicao(
  _pedido_id uuid,
  _vendedor_id uuid,
  _itens jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pedido RECORD;
  _item jsonb;
  _produto_id uuid;
  _qtd numeric;
  _count int := 0;
  _all_received boolean := true;
BEGIN
  -- Lock pedido
  SELECT * INTO _pedido
  FROM public.pedidos_reposicao
  WHERE id = _pedido_id
    AND empresa_id = public.get_my_empresa_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido de reposição não encontrado';
  END IF;

  IF _pedido.status = 'recebido' THEN
    RAISE EXCEPTION 'Este pedido já foi totalmente recebido';
  END IF;

  IF _pedido.status NOT IN ('finalizado', 'recebido_parcial') THEN
    RAISE EXCEPTION 'Pedido precisa estar finalizado para receber';
  END IF;

  -- Process each item
  FOR _item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    _produto_id := (_item->>'produto_id')::uuid;
    _qtd := (_item->>'quantidade_recebida')::numeric;

    IF _qtd > 0 THEN
      -- Update item received qty
      UPDATE public.itens_pedido_reposicao
      SET quantidade_recebida = quantidade_recebida + _qtd,
          updated_at = now()
      WHERE pedido_reposicao_id = _pedido_id
        AND produto_id = _produto_id;

      -- Create stock movement (reposicao type uses existing trigger fn_atualizar_estoque)
      INSERT INTO public.movimentos_estoque (
        empresa_id, produto_id, vendedor_id, tipo, quantidade, observacoes
      ) VALUES (
        _pedido.empresa_id, _produto_id, _vendedor_id, 'reposicao', _qtd,
        'Pedido Reposição #' || _pedido.numero
      );

      _count := _count + 1;
    END IF;
  END LOOP;

  -- Check if all items fully received
  IF EXISTS (
    SELECT 1 FROM public.itens_pedido_reposicao
    WHERE pedido_reposicao_id = _pedido_id
      AND quantidade_recebida < quantidade_solicitada
  ) THEN
    _all_received := false;
  END IF;

  -- Update pedido status
  UPDATE public.pedidos_reposicao
  SET status = CASE WHEN _all_received THEN 'recebido' ELSE 'recebido_parcial' END,
      data_recebimento = CASE WHEN _all_received THEN now() ELSE data_recebimento END,
      updated_at = now()
  WHERE id = _pedido_id;

  RETURN jsonb_build_object(
    'success', true,
    'itens_processados', _count,
    'status', CASE WHEN _all_received THEN 'recebido' ELSE 'recebido_parcial' END
  );
END;
$$;
