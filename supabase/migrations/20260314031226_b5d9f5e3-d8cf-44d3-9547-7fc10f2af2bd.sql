
-- 1. Trigger to block edits on finalized/cancelled vendas (except cancellation itself)
CREATE OR REPLACE FUNCTION public.fn_protect_venda_finalizada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow status change to 'cancelada' (the cancellation flow)
  IF OLD.status IN ('finalizada', 'cancelada') AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    -- Block any field changes on finalized/cancelled vendas
    RAISE EXCEPTION 'Vendas finalizadas ou canceladas não podem ser alteradas. Utilize cancelamento e refaça a venda.';
  END IF;
  
  -- If status is being changed to cancelada, allow it (cancellation flow)
  IF NEW.status = 'cancelada' AND OLD.status = 'finalizada' THEN
    RETURN NEW;
  END IF;
  
  -- If already cancelled, block everything
  IF OLD.status = 'cancelada' THEN
    RAISE EXCEPTION 'Vendas canceladas não podem ser alteradas.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_venda_finalizada
BEFORE UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_venda_finalizada();

-- 2. Trigger to block edits on itens_venda for finalized/cancelled vendas
CREATE OR REPLACE FUNCTION public.fn_protect_itens_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _status text;
BEGIN
  SELECT status INTO _status FROM public.vendas 
  WHERE id = COALESCE(NEW.venda_id, OLD.venda_id);
  
  IF _status IN ('finalizada', 'cancelada') THEN
    RAISE EXCEPTION 'Itens de vendas finalizadas ou canceladas não podem ser alterados.';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_protect_itens_venda
BEFORE UPDATE OR INSERT ON public.itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_itens_venda();

-- 3. Trigger to block edits on parcelas for cancelled vendas (except the cancellation RPC which uses SECURITY DEFINER)
-- Note: fn_cancelar_venda runs as SECURITY DEFINER so it bypasses RLS but NOT triggers
-- We need to allow the cancellation flow to update parcelas, so we check if it's a cancellation update
CREATE OR REPLACE FUNCTION public.fn_protect_parcelas_venda_cancelada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _venda_status text;
BEGIN
  -- Allow setting status to cancelada (part of cancellation flow)
  IF NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
    RETURN NEW;
  END IF;
  
  -- If parcela is already cancelled, block changes
  IF OLD.status = 'cancelada' THEN
    RAISE EXCEPTION 'Parcelas canceladas não podem ser alteradas.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_parcelas_cancelada
BEFORE UPDATE ON public.parcelas
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_parcelas_venda_cancelada();

-- 4. Create financial_integrity_logs table for audit results
CREATE TABLE IF NOT EXISTS public.financial_integrity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo_problema text NOT NULL,
  registro_afetado text,
  descricao text NOT NULL,
  data_detectada timestamptz NOT NULL DEFAULT now(),
  nivel_risco text NOT NULL DEFAULT 'medio' CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'critico')),
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_integrity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_integrity_logs_select" ON public.financial_integrity_logs
FOR SELECT TO authenticated
USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "financial_integrity_logs_insert" ON public.financial_integrity_logs
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_my_empresa_id());

-- 5. Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
