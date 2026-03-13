
-- Enum for pedido status
CREATE TYPE public.status_pedido AS ENUM (
  'rascunho',
  'aguardando_entrega',
  'em_rota',
  'entregue',
  'cancelado',
  'convertido_em_venda'
);

-- Pedidos table
CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  vendedor_id uuid NOT NULL,
  data_pedido timestamp with time zone NOT NULL DEFAULT now(),
  data_prevista_entrega date NOT NULL,
  horario_entrega text NOT NULL DEFAULT '',
  status public.status_pedido NOT NULL DEFAULT 'rascunho',
  subtotal numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  observacoes text NOT NULL DEFAULT '',
  venda_id uuid REFERENCES public.vendas(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Itens do pedido
CREATE TABLE public.itens_pedido (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  nome_produto text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  preco_original numeric NOT NULL DEFAULT 0,
  preco_pedido numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  bonus boolean NOT NULL DEFAULT false,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- Pedidos RLS policies
CREATE POLICY "Pedidos: select own empresa" ON public.pedidos
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Pedidos: insert own empresa" ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Pedidos: update own empresa" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id())
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Pedidos: delete admin only" ON public.pedidos
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

-- Itens pedido RLS policies (via pedido)
CREATE POLICY "ItensPedido: select via pedido" ON public.itens_pedido
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = itens_pedido.pedido_id AND p.empresa_id = get_my_empresa_id()));

CREATE POLICY "ItensPedido: insert via pedido" ON public.itens_pedido
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = itens_pedido.pedido_id AND p.empresa_id = get_my_empresa_id()));

CREATE POLICY "ItensPedido: update via pedido" ON public.itens_pedido
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = itens_pedido.pedido_id AND p.empresa_id = get_my_empresa_id()));

CREATE POLICY "ItensPedido: delete via pedido" ON public.itens_pedido
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = itens_pedido.pedido_id AND p.empresa_id = get_my_empresa_id()));

-- Audit triggers for pedidos
CREATE TRIGGER trg_audit_pedidos
  AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_itens_pedido
  AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
