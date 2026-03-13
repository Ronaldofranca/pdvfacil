
-- 1) Add telefone_normalizado column
ALTER TABLE public.cliente_telefones
  ADD COLUMN IF NOT EXISTS telefone_normalizado text NOT NULL DEFAULT '';

-- 2) Create normalization function
CREATE OR REPLACE FUNCTION public.fn_normalize_telefone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.telefone_normalizado := regexp_replace(NEW.telefone, '[^0-9]', '', 'g');
  RETURN NEW;
END;
$$;

-- 3) Create trigger to auto-normalize on insert/update
DROP TRIGGER IF EXISTS trg_normalize_telefone ON public.cliente_telefones;
CREATE TRIGGER trg_normalize_telefone
  BEFORE INSERT OR UPDATE OF telefone ON public.cliente_telefones
  FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_telefone();

-- 4) Normalize existing data
UPDATE public.cliente_telefones
SET telefone_normalizado = regexp_replace(telefone, '[^0-9]', '', 'g')
WHERE telefone_normalizado = '' AND telefone != '';

-- 5) Drop old unique index on (empresa_id, telefone) if exists
DROP INDEX IF EXISTS public.idx_cliente_telefones_empresa_telefone;

-- 6) Create new unique index on (empresa_id, telefone_normalizado) excluding empty values
CREATE UNIQUE INDEX idx_cliente_telefones_empresa_tel_norm
  ON public.cliente_telefones (empresa_id, telefone_normalizado)
  WHERE telefone_normalizado != '';

-- 7) Add audit trigger for cliente_telefones
DROP TRIGGER IF EXISTS trg_audit_cliente_telefones ON public.cliente_telefones;
CREATE TRIGGER trg_audit_cliente_telefones
  AFTER INSERT OR UPDATE OR DELETE ON public.cliente_telefones
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- 8) Migrate existing clientes.telefone data that hasn't been migrated yet
INSERT INTO public.cliente_telefones (empresa_id, cliente_id, telefone, telefone_normalizado, tipo, principal)
SELECT
  c.empresa_id,
  c.id,
  c.telefone,
  regexp_replace(c.telefone, '[^0-9]', '', 'g'),
  'celular',
  true
FROM public.clientes c
WHERE c.telefone != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.cliente_telefones ct WHERE ct.cliente_id = c.id
  )
ON CONFLICT DO NOTHING;
