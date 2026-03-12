
-- Tabela de níveis de recompensa
CREATE TABLE public.niveis_recompensa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  pontos_minimos integer NOT NULL DEFAULT 0,
  cor text NOT NULL DEFAULT '#10b981',
  icone text NOT NULL DEFAULT 'Star',
  beneficios text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, pontos_minimos)
);

ALTER TABLE public.niveis_recompensa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NiveisRecompensa: select own empresa"
  ON public.niveis_recompensa FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "NiveisRecompensa: insert admin"
  ON public.niveis_recompensa FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "NiveisRecompensa: update admin"
  ON public.niveis_recompensa FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin())
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "NiveisRecompensa: delete admin"
  ON public.niveis_recompensa FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());
