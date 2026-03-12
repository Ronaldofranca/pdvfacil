
-- Settings table for empresa-level configuration (PDV, notifications, security, etc.)
CREATE TABLE public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- PDV settings
  permitir_venda_sem_estoque boolean NOT NULL DEFAULT false,
  bloquear_venda_sem_estoque_vendedor boolean NOT NULL DEFAULT true,
  mostrar_preco_custo boolean NOT NULL DEFAULT false,
  permitir_alterar_preco boolean NOT NULL DEFAULT false,
  permitir_desconto boolean NOT NULL DEFAULT true,
  permitir_brinde boolean NOT NULL DEFAULT false,
  
  -- Payment conditions
  parcelas_max integer NOT NULL DEFAULT 6,
  intervalo_parcelas integer NOT NULL DEFAULT 30,
  juros_parcelas numeric NOT NULL DEFAULT 0,
  
  -- Vendor defaults
  comissao_padrao numeric NOT NULL DEFAULT 5,
  meta_mensal_padrao numeric NOT NULL DEFAULT 10000,
  
  -- Catalog
  catalogo_publico_ativo boolean NOT NULL DEFAULT true,
  
  -- Notifications
  alerta_parcelas_vencidas boolean NOT NULL DEFAULT true,
  alerta_estoque_baixo boolean NOT NULL DEFAULT true,
  alerta_cliente_inativo boolean NOT NULL DEFAULT true,
  alerta_meta_vendedor boolean NOT NULL DEFAULT true,
  estoque_minimo_alerta integer NOT NULL DEFAULT 5,
  dias_cliente_inativo integer NOT NULL DEFAULT 30,
  
  -- Security
  sessao_expiracao_horas integer NOT NULL DEFAULT 24,
  login_max_tentativas integer NOT NULL DEFAULT 5,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(empresa_id)
);

-- Formas de pagamento table
CREATE TABLE public.formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cidades atendidas table
CREATE TABLE public.cidades_atendidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cidade text NOT NULL,
  estado text NOT NULL DEFAULT '',
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for configuracoes
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configuracoes: select own empresa" ON public.configuracoes
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Configuracoes: insert admin" ON public.configuracoes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "Configuracoes: update admin" ON public.configuracoes
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin())
  WITH CHECK (empresa_id = get_my_empresa_id());

-- RLS for formas_pagamento
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FormasPagamento: select own empresa" ON public.formas_pagamento
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "FormasPagamento: insert admin" ON public.formas_pagamento
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "FormasPagamento: update admin" ON public.formas_pagamento
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "FormasPagamento: delete admin" ON public.formas_pagamento
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

-- RLS for cidades_atendidas
ALTER TABLE public.cidades_atendidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CidadesAtendidas: select own empresa" ON public.cidades_atendidas
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "CidadesAtendidas: insert admin" ON public.cidades_atendidas
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND (is_admin() OR is_gerente()));

CREATE POLICY "CidadesAtendidas: update admin" ON public.cidades_atendidas
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND (is_admin() OR is_gerente()));

CREATE POLICY "CidadesAtendidas: delete admin" ON public.cidades_atendidas
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());
