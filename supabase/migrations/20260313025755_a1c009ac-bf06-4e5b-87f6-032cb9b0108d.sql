
-- 1) Create helper function to get the public catalog empresa_id
CREATE OR REPLACE FUNCTION public.get_public_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.catalogo_config LIMIT 1
$$;

-- 2) Fix testemunhos: scope anon policy by empresa_id
DROP POLICY IF EXISTS "Testemunhos: public read active" ON public.testemunhos;
CREATE POLICY "Testemunhos: public read active"
  ON public.testemunhos FOR SELECT
  TO anon
  USING (ativo = true AND empresa_id = public.get_public_empresa_id());

-- 3) Fix categorias: scope anon policy by empresa_id
DROP POLICY IF EXISTS "Categorias: public read active" ON public.categorias;
CREATE POLICY "Categorias: public read active"
  ON public.categorias FOR SELECT
  TO anon
  USING (ativa = true AND empresa_id = public.get_public_empresa_id());

-- 4) Fix profiles empresa_id escalation: add trigger to prevent changing empresa_id/user_id
CREATE OR REPLACE FUNCTION public.fn_protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Changing empresa_id is not allowed';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Changing user_id is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_profile_fields();
