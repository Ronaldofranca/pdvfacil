
-- Tabela de metas de vendedores
CREATE TABLE public.metas_vendedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  vendedor_id uuid NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL CHECK (ano >= 2024),
  meta_valor numeric NOT NULL DEFAULT 0,
  percentual_comissao numeric NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, vendedor_id, mes, ano)
);

ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Metas: select own empresa"
  ON public.metas_vendedor FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Metas: insert admin/gerente"
  ON public.metas_vendedor FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND (public.is_admin() OR public.is_gerente()));

CREATE POLICY "Metas: update admin/gerente"
  ON public.metas_vendedor FOR UPDATE
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND (public.is_admin() OR public.is_gerente()));

CREATE POLICY "Metas: delete admin only"
  ON public.metas_vendedor FOR DELETE
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());
