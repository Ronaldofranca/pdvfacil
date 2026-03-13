
-- Table for reconciliation results
CREATE TABLE public.conciliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  data date NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  total_vendas numeric NOT NULL DEFAULT 0,
  total_recebido numeric NOT NULL DEFAULT 0,
  total_crediario numeric NOT NULL DEFAULT 0,
  total_parcelas_geradas numeric NOT NULL DEFAULT 0,
  total_pagamentos numeric NOT NULL DEFAULT 0,
  saldo_caixa numeric NOT NULL DEFAULT 0,
  total_divergencias integer NOT NULL DEFAULT 0,
  valor_divergente numeric NOT NULL DEFAULT 0,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, data)
);

-- Table for individual reconciliation issues
CREATE TABLE public.conciliacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conciliacao_id uuid NOT NULL REFERENCES public.conciliacoes(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  tabela text NOT NULL DEFAULT '',
  registro_id uuid,
  cliente_nome text NOT NULL DEFAULT '',
  valor_esperado numeric NOT NULL DEFAULT 0,
  valor_encontrado numeric NOT NULL DEFAULT 0,
  diferenca numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conciliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliacao_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for conciliacoes
CREATE POLICY "Conciliacoes: select own empresa" ON public.conciliacoes
  FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Conciliacoes: insert own empresa" ON public.conciliacoes
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Conciliacoes: update own empresa" ON public.conciliacoes
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id())
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Conciliacoes: delete admin" ON public.conciliacoes
  FOR DELETE TO authenticated USING (empresa_id = get_my_empresa_id() AND is_admin());

-- RLS policies for conciliacao_itens
CREATE POLICY "ConciliacaoItens: select own empresa" ON public.conciliacao_itens
  FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());

CREATE POLICY "ConciliacaoItens: insert own empresa" ON public.conciliacao_itens
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "ConciliacaoItens: delete admin" ON public.conciliacao_itens
  FOR DELETE TO authenticated USING (empresa_id = get_my_empresa_id() AND is_admin());

-- Audit triggers
CREATE TRIGGER trg_audit_conciliacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.conciliacoes
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_conciliacao_itens
  AFTER INSERT OR UPDATE OR DELETE ON public.conciliacao_itens
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
