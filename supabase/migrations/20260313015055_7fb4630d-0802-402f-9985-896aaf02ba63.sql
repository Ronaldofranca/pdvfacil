-- Sincroniza telefone principal para campo legado clientes.telefone (compatibilidade CRM/PDV)
CREATE OR REPLACE FUNCTION public.fn_sync_cliente_telefone_principal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cliente_id uuid;
  _telefone_principal text;
BEGIN
  _cliente_id := COALESCE(NEW.cliente_id, OLD.cliente_id);

  SELECT ct.telefone
    INTO _telefone_principal
  FROM public.cliente_telefones ct
  WHERE ct.cliente_id = _cliente_id
    AND ct.principal = true
  ORDER BY ct.updated_at DESC
  LIMIT 1;

  IF _telefone_principal IS NULL THEN
    SELECT ct.telefone
      INTO _telefone_principal
    FROM public.cliente_telefones ct
    WHERE ct.cliente_id = _cliente_id
    ORDER BY ct.updated_at DESC
    LIMIT 1;
  END IF;

  UPDATE public.clientes c
  SET telefone = COALESCE(_telefone_principal, ''),
      updated_at = now()
  WHERE c.id = _cliente_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cliente_telefone_principal ON public.cliente_telefones;
CREATE TRIGGER trg_sync_cliente_telefone_principal
AFTER INSERT OR UPDATE OR DELETE ON public.cliente_telefones
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_cliente_telefone_principal();