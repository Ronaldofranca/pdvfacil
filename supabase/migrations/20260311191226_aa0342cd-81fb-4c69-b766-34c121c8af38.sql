
-- Status da venda
CREATE TYPE public.status_venda AS ENUM ('rascunho','pendente','finalizada','cancelada');

-- Formas de pagamento
CREATE TYPE public.forma_pagamento AS ENUM ('dinheiro','pix','cartao_credito','cartao_debito','boleto','transferencia','outro');

-- Vendas
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  vendedor_id UUID NOT NULL,
  status status_venda NOT NULL DEFAULT 'rascunho',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  pagamentos JSONB NOT NULL DEFAULT '[]',
  observacoes TEXT NOT NULL DEFAULT '',
  data_venda TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendas: select own empresa" ON public.vendas
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Vendas: insert own empresa" ON public.vendas
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.has_permission('criar_venda'));

CREATE POLICY "Vendas: update own empresa" ON public.vendas
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Vendas: delete admin only" ON public.vendas
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Itens da venda
CREATE TABLE public.itens_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  nome_produto TEXT NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
  preco_original NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_vendido NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus BOOLEAN NOT NULL DEFAULT false,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens venda: select via venda" ON public.itens_venda
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND v.empresa_id = public.get_my_empresa_id()));

CREATE POLICY "Itens venda: insert via venda" ON public.itens_venda
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND v.empresa_id = public.get_my_empresa_id()));

CREATE POLICY "Itens venda: update via venda" ON public.itens_venda
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND v.empresa_id = public.get_my_empresa_id()));

CREATE POLICY "Itens venda: delete via venda" ON public.itens_venda
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND v.empresa_id = public.get_my_empresa_id()));
