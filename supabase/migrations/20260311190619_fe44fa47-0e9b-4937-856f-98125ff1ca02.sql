
-- Clientes CRM
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cpf_cnpj TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'pf' CHECK (tipo IN ('pf','pj')),
  cidade TEXT NOT NULL DEFAULT '',
  rua TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  cep TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  observacoes TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes: select own empresa" ON public.clientes
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Clientes: insert own empresa" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Clientes: update own empresa" ON public.clientes
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Clientes: delete admin only" ON public.clientes
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Histórico de compras
CREATE TABLE public.historico_compras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_compra TIMESTAMPTZ NOT NULL DEFAULT now(),
  produtos JSONB NOT NULL DEFAULT '[]',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Historico: select own empresa" ON public.historico_compras
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Historico: insert own empresa" ON public.historico_compras
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Historico: update own empresa" ON public.historico_compras
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Historico: delete admin only" ON public.historico_compras
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());
