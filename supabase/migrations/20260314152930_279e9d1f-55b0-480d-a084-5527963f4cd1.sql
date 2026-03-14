
-- Fix the protection trigger to allow internal system updates (total sync, profit computation)
-- while still blocking manual edits to finalized/cancelled vendas
CREATE OR REPLACE FUNCTION public.fn_protect_venda_finalizada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If status is being changed to cancelada from finalizada, allow it (cancellation flow)
  IF NEW.status = 'cancelada' AND OLD.status = 'finalizada' THEN
    RETURN NEW;
  END IF;
  
  -- If already cancelled, block everything
  IF OLD.status = 'cancelada' THEN
    RAISE EXCEPTION 'Vendas canceladas não podem ser alteradas.';
  END IF;

  -- For finalized vendas: allow internal trigger updates that only change computed fields
  -- (total, total_cost, total_profit, updated_at, observacoes for cancellation notes)
  IF OLD.status = 'finalizada' AND NEW.status = 'finalizada' THEN
    -- Check if any business-critical field changed (other than computed totals)
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.vendedor_id IS DISTINCT FROM OLD.vendedor_id
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.desconto_total IS DISTINCT FROM OLD.desconto_total
       OR NEW.pagamentos IS DISTINCT FROM OLD.pagamentos
       OR NEW.data_venda IS DISTINCT FROM OLD.data_venda
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    THEN
      RAISE EXCEPTION 'Vendas finalizadas não podem ser alteradas. Utilize cancelamento e refaça a venda.';
    END IF;
    -- Allow: total, total_cost, total_profit, updated_at, observacoes changes (internal triggers)
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;
