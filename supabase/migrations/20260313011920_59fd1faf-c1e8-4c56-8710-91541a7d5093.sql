
-- Create cliente_telefones table
CREATE TABLE public.cliente_telefones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  telefone text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'celular',
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one phone per empresa (prevent duplicates)
CREATE UNIQUE INDEX idx_cliente_telefones_empresa_telefone
  ON public.cliente_telefones (empresa_id, telefone)
  WHERE telefone <> '';

-- Enable RLS
ALTER TABLE public.cliente_telefones ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "ClienteTelefones: select own empresa"
  ON public.cliente_telefones FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "ClienteTelefones: insert own empresa"
  ON public.cliente_telefones FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "ClienteTelefones: update own empresa"
  ON public.cliente_telefones FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "ClienteTelefones: delete own empresa"
  ON public.cliente_telefones FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id());

-- Migrate existing phone data from clientes table
INSERT INTO public.cliente_telefones (empresa_id, cliente_id, telefone, tipo, principal)
SELECT empresa_id, id, telefone, 'celular', true
FROM public.clientes
WHERE telefone IS NOT NULL AND telefone <> '';

-- Trigger to ensure only one principal per client
CREATE OR REPLACE FUNCTION public.fn_ensure_single_principal_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.principal = true THEN
    UPDATE public.cliente_telefones
    SET principal = false, updated_at = now()
    WHERE cliente_id = NEW.cliente_id
      AND id != NEW.id
      AND principal = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_single_principal_phone
  BEFORE INSERT OR UPDATE ON public.cliente_telefones
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_ensure_single_principal_phone();
