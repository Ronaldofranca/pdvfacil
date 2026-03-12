
-- 1) Add referral columns to clientes
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS cliente_indicador_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pontos_indicacao numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clientes_indicador ON public.clientes(cliente_indicador_id);

-- 2) Add config fields for referral program
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS pontos_por_indicacao integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS valor_minimo_indicacao numeric NOT NULL DEFAULT 0;

-- 3) Create indicacoes_clientes table
CREATE TABLE public.indicacoes_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  cliente_indicador_id uuid NOT NULL REFERENCES public.clientes(id),
  cliente_indicado_id uuid NOT NULL REFERENCES public.clientes(id),
  venda_id uuid REFERENCES public.vendas(id),
  pontos_gerados numeric NOT NULL DEFAULT 0,
  data_indicacao timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.indicacoes_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Indicacoes: select own empresa" ON public.indicacoes_clientes
  FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Indicacoes: insert own empresa" ON public.indicacoes_clientes
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Indicacoes: delete admin only" ON public.indicacoes_clientes
  FOR DELETE TO authenticated USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE INDEX idx_indicacoes_indicador ON public.indicacoes_clientes(cliente_indicador_id);
CREATE INDEX idx_indicacoes_indicado ON public.indicacoes_clientes(cliente_indicado_id);
CREATE INDEX idx_indicacoes_empresa ON public.indicacoes_clientes(empresa_id);

-- 4) Create uso_pontos table for tracking point redemptions
CREATE TABLE public.uso_pontos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  pontos_usados numeric NOT NULL,
  tipo text NOT NULL DEFAULT 'desconto',
  venda_id uuid REFERENCES public.vendas(id),
  descricao text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.uso_pontos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UsoPontos: select own empresa" ON public.uso_pontos
  FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());

CREATE POLICY "UsoPontos: insert own empresa" ON public.uso_pontos
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id());

CREATE INDEX idx_uso_pontos_cliente ON public.uso_pontos(cliente_id);
CREATE INDEX idx_uso_pontos_empresa ON public.uso_pontos(empresa_id);

-- 5) Constraint: client cannot refer themselves
ALTER TABLE public.clientes ADD CONSTRAINT chk_no_self_referral CHECK (cliente_indicador_id != id);
