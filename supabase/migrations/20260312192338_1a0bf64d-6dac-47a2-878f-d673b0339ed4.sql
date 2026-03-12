
-- Add total_indicacoes and total_compras columns to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS total_indicacoes integer NOT NULL DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS total_compras integer NOT NULL DEFAULT 0;

-- Function to award points to the referring client when a sale is finalized
CREATE OR REPLACE FUNCTION public.fn_award_referral_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _indicador_id uuid;
  _pontos_config integer;
  _valor_minimo numeric;
BEGIN
  -- Only trigger on finalizada status
  IF NEW.status <> 'finalizada' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if old status was already finalizada (avoid double-counting on updates)
  IF TG_OP = 'UPDATE' AND OLD.status = 'finalizada' THEN
    RETURN NEW;
  END IF;

  -- Skip if no client
  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this client has a referrer
  SELECT cliente_indicador_id INTO _indicador_id
  FROM public.clientes
  WHERE id = NEW.cliente_id;

  IF _indicador_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get config for points and minimum value
  SELECT COALESCE(pontos_por_indicacao, 10), COALESCE(valor_minimo_indicacao, 0)
  INTO _pontos_config, _valor_minimo
  FROM public.configuracoes
  WHERE empresa_id = NEW.empresa_id
  LIMIT 1;

  IF _pontos_config IS NULL THEN
    _pontos_config := 10;
  END IF;
  IF _valor_minimo IS NULL THEN
    _valor_minimo := 0;
  END IF;

  -- Check minimum sale value
  IF NEW.total < _valor_minimo THEN
    RETURN NEW;
  END IF;

  -- Award points to the referrer
  UPDATE public.clientes
  SET pontos_indicacao = pontos_indicacao + _pontos_config,
      updated_at = now()
  WHERE id = _indicador_id;

  -- Record in indicacoes_clientes
  INSERT INTO public.indicacoes_clientes (empresa_id, cliente_indicador_id, cliente_indicado_id, venda_id, pontos_gerados)
  VALUES (NEW.empresa_id, _indicador_id, NEW.cliente_id, NEW.id, _pontos_config);

  -- Update total_compras on the buyer
  UPDATE public.clientes
  SET total_compras = total_compras + 1,
      updated_at = now()
  WHERE id = NEW.cliente_id;

  RETURN NEW;
END;
$$;

-- Create trigger on vendas for auto-awarding points
DROP TRIGGER IF EXISTS trg_award_referral_points ON public.vendas;
CREATE TRIGGER trg_award_referral_points
  AFTER INSERT OR UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_award_referral_points();

-- Function to update total_indicacoes when a new client is referred
CREATE OR REPLACE FUNCTION public.fn_update_total_indicacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.cliente_indicador_id IS NOT NULL THEN
    -- Only count if it's a new referral (insert or changed referrer)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.cliente_indicador_id IS DISTINCT FROM NEW.cliente_indicador_id) THEN
      UPDATE public.clientes
      SET total_indicacoes = total_indicacoes + 1,
          updated_at = now()
      WHERE id = NEW.cliente_indicador_id;

      -- Decrement old referrer if changed
      IF TG_OP = 'UPDATE' AND OLD.cliente_indicador_id IS NOT NULL THEN
        UPDATE public.clientes
        SET total_indicacoes = GREATEST(0, total_indicacoes - 1),
            updated_at = now()
        WHERE id = OLD.cliente_indicador_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_total_indicacoes ON public.clientes;
CREATE TRIGGER trg_update_total_indicacoes
  AFTER INSERT OR UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_total_indicacoes();
