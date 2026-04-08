
-- Add 'parcial' to status_parcela enum
ALTER TYPE public.status_parcela ADD VALUE IF NOT EXISTS 'parcial';

-- Update the parcela status trigger to handle 'parcial' status
CREATE OR REPLACE FUNCTION public.fn_parcela_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.valor_pago >= NEW.valor_total THEN
    NEW.status := 'paga';
    IF NEW.data_pagamento IS NULL THEN
      NEW.data_pagamento := now();
    END IF;
  ELSIF NEW.valor_pago > 0 AND NEW.valor_pago < NEW.valor_total THEN
    NEW.status := 'parcial';
    IF NEW.data_pagamento IS NULL OR (TG_OP = 'UPDATE' AND NEW.valor_pago != OLD.valor_pago) THEN
      NEW.data_pagamento := now();
    END IF;
  ELSIF NEW.vencimento < CURRENT_DATE AND NEW.valor_pago < NEW.valor_total THEN
    NEW.status := 'vencida';
  ELSE
    NEW.status := 'pendente';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
