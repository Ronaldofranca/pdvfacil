
-- 1. Add empresa_id column to role_permissoes
ALTER TABLE public.role_permissoes
  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 2. Populate empresa_id for existing rows: duplicate each row for every empresa
-- First, update existing rows with the first empresa (to avoid nulls)
UPDATE public.role_permissoes
SET empresa_id = (SELECT id FROM public.empresas ORDER BY created_at LIMIT 1)
WHERE empresa_id IS NULL;

-- Insert duplicates for all other empresas
INSERT INTO public.role_permissoes (role, permissao_id, empresa_id)
SELECT rp.role, rp.permissao_id, e.id
FROM public.role_permissoes rp
CROSS JOIN public.empresas e
WHERE e.id != rp.empresa_id
ON CONFLICT DO NOTHING;

-- 3. Make empresa_id NOT NULL now that all rows have values
ALTER TABLE public.role_permissoes
  ALTER COLUMN empresa_id SET NOT NULL;

-- 4. Update unique constraint to include empresa_id
ALTER TABLE public.role_permissoes
  DROP CONSTRAINT IF EXISTS role_permissoes_role_permissao_id_key;

ALTER TABLE public.role_permissoes
  ADD CONSTRAINT role_permissoes_role_permissao_id_empresa_id_key
  UNIQUE (role, permissao_id, empresa_id);

-- 5. Drop old RLS policies
DROP POLICY IF EXISTS "Authenticated users can view role_permissoes" ON public.role_permissoes;
DROP POLICY IF EXISTS "Service role can insert role_permissoes" ON public.role_permissoes;
DROP POLICY IF EXISTS "Service role can delete role_permissoes" ON public.role_permissoes;

-- 6. Create new empresa-scoped RLS policies
CREATE POLICY "role_permissoes: select own empresa"
  ON public.role_permissoes FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "role_permissoes: insert admin own empresa"
  ON public.role_permissoes FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.is_admin());

CREATE POLICY "role_permissoes: delete admin own empresa"
  ON public.role_permissoes FOR DELETE
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- 7. Add audit trigger
DROP TRIGGER IF EXISTS trg_audit_role_permissoes ON public.role_permissoes;
CREATE TRIGGER trg_audit_role_permissoes
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- 8. Performance index
CREATE INDEX IF NOT EXISTS idx_role_permissoes_empresa ON public.role_permissoes (empresa_id);

-- 9. Update has_permission function to be empresa-scoped
CREATE OR REPLACE FUNCTION public.has_permission(_permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissoes rp ON rp.role = ur.role AND rp.empresa_id = ur.empresa_id
    JOIN public.permissoes p ON p.id = rp.permissao_id
    WHERE ur.user_id = auth.uid()
      AND ur.empresa_id = public.get_my_empresa_id()
      AND p.nome = _permission_name
  )
$$;
