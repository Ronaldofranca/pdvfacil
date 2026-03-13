
-- =============================================
-- ENHANCE pedidos table with new columns
-- =============================================

-- Add new tracking columns
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS entregue_em timestamptz,
  ADD COLUMN IF NOT EXISTS em_rota_em timestamptz,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Rename desconto to desconto_total for clarity
ALTER TABLE public.pedidos RENAME COLUMN desconto TO desconto_total;

-- =============================================
-- ENHANCE itens_pedido with empresa_id + updated_at
-- =============================================

ALTER TABLE public.itens_pedido
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill empresa_id from parent pedido
UPDATE public.itens_pedido ip
SET empresa_id = p.empresa_id
FROM public.pedidos p
WHERE ip.pedido_id = p.id AND ip.empresa_id IS NULL;

-- Make empresa_id NOT NULL after backfill
ALTER TABLE public.itens_pedido ALTER COLUMN empresa_id SET NOT NULL;

-- =============================================
-- INDEXES for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_status ON public.pedidos(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor ON public.pedidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_entrega ON public.pedidos(data_prevista_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_venda ON public.pedidos(venda_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_entrega ON public.pedidos(status, data_prevista_entrega) WHERE status IN ('rascunho', 'aguardando_entrega', 'em_rota');
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_empresa ON public.itens_pedido(empresa_id);

-- =============================================
-- TRIGGER: sync pedido totals when items change
-- =============================================

CREATE OR REPLACE FUNCTION public.fn_sync_pedido_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pedido_id uuid;
  _soma NUMERIC;
BEGIN
  _pedido_id := COALESCE(NEW.pedido_id, OLD.pedido_id);

  SELECT COALESCE(SUM(subtotal), 0) INTO _soma
  FROM public.itens_pedido
  WHERE pedido_id = _pedido_id;

  UPDATE public.pedidos
  SET subtotal = _soma,
      valor_total = _soma - COALESCE(desconto_total, 0),
      updated_at = now()
  WHERE id = _pedido_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pedido_total ON public.itens_pedido;
CREATE TRIGGER trg_sync_pedido_total
  AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_pedido_total();

-- =============================================
-- TRIGGER: auto-set timestamp columns on status change
-- =============================================

CREATE OR REPLACE FUNCTION public.fn_pedido_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'em_rota' AND NEW.em_rota_em IS NULL THEN
      NEW.em_rota_em := now();
    END IF;
    IF NEW.status = 'entregue' AND NEW.entregue_em IS NULL THEN
      NEW.entregue_em := now();
    END IF;
    IF NEW.status = 'convertido_em_venda' AND NEW.entregue_em IS NULL THEN
      NEW.entregue_em := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedido_status_timestamps ON public.pedidos;
CREATE TRIGGER trg_pedido_status_timestamps
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_pedido_status_timestamps();

-- =============================================
-- AUDIT TRIGGERS for pedidos and itens_pedido
-- =============================================

DROP TRIGGER IF EXISTS trg_audit_pedidos ON public.pedidos;
CREATE TRIGGER trg_audit_pedidos
  AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_itens_pedido ON public.itens_pedido;
CREATE TRIGGER trg_audit_itens_pedido
  AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- =============================================
-- RLS for itens_pedido with empresa_id (direct)
-- =============================================

-- Drop old policies that use subquery pattern
DROP POLICY IF EXISTS "ItensPedido: select via pedido" ON public.itens_pedido;
DROP POLICY IF EXISTS "ItensPedido: insert via pedido" ON public.itens_pedido;
DROP POLICY IF EXISTS "ItensPedido: update via pedido" ON public.itens_pedido;
DROP POLICY IF EXISTS "ItensPedido: delete via pedido" ON public.itens_pedido;

-- New direct empresa_id policies (more performant)
CREATE POLICY "ItensPedido: select own empresa"
  ON public.itens_pedido FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "ItensPedido: insert own empresa"
  ON public.itens_pedido FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "ItensPedido: update own empresa"
  ON public.itens_pedido FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "ItensPedido: delete own empresa"
  ON public.itens_pedido FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id());
