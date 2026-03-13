
-- Caixa diário
CREATE TABLE public.caixa_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  usuario_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_contado numeric,
  total_entradas numeric NOT NULL DEFAULT 0,
  total_sangrias numeric NOT NULL DEFAULT 0,
  total_suprimentos numeric NOT NULL DEFAULT 0,
  saldo_teorico numeric NOT NULL DEFAULT 0,
  diferenca numeric,
  status text NOT NULL DEFAULT 'aberto',
  observacao_abertura text NOT NULL DEFAULT '',
  observacao_fechamento text NOT NULL DEFAULT '',
  aberto_em timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, usuario_id, data)
);

ALTER TABLE public.caixa_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CaixaDiario: select own empresa" ON public.caixa_diario FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());
CREATE POLICY "CaixaDiario: insert own empresa" ON public.caixa_diario FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "CaixaDiario: update own empresa" ON public.caixa_diario FOR UPDATE TO authenticated USING (empresa_id = get_my_empresa_id());
CREATE POLICY "CaixaDiario: delete admin" ON public.caixa_diario FOR DELETE TO authenticated USING (empresa_id = get_my_empresa_id() AND is_admin());

-- Movimentações do caixa
CREATE TABLE public.caixa_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  caixa_id uuid NOT NULL REFERENCES public.caixa_diario(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  tipo text NOT NULL,
  valor numeric NOT NULL,
  descricao text NOT NULL DEFAULT '',
  referencia_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CaixaMov: select own empresa" ON public.caixa_movimentacoes FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());
CREATE POLICY "CaixaMov: insert own empresa" ON public.caixa_movimentacoes FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "CaixaMov: delete admin" ON public.caixa_movimentacoes FOR DELETE TO authenticated USING (empresa_id = get_my_empresa_id() AND is_admin());

-- Trigger to update caixa totals on movimentacao insert
CREATE OR REPLACE FUNCTION public.fn_atualizar_caixa_totais()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _entradas numeric;
  _sangrias numeric;
  _suprimentos numeric;
  _valor_inicial numeric;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN tipo IN ('entrada_venda','entrada_recebimento','suprimento','ajuste_manual_entrada') THEN valor ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN tipo IN ('sangria','ajuste_manual_saida') THEN valor ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0)
  INTO _entradas, _sangrias, _suprimentos
  FROM public.caixa_movimentacoes
  WHERE caixa_id = COALESCE(NEW.caixa_id, OLD.caixa_id);

  SELECT valor_inicial INTO _valor_inicial
  FROM public.caixa_diario WHERE id = COALESCE(NEW.caixa_id, OLD.caixa_id);

  UPDATE public.caixa_diario
  SET total_entradas = _entradas,
      total_sangrias = _sangrias,
      total_suprimentos = _suprimentos,
      saldo_teorico = _valor_inicial + _entradas - _sangrias,
      updated_at = now()
  WHERE id = COALESCE(NEW.caixa_id, OLD.caixa_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_atualizar_caixa_totais
AFTER INSERT OR DELETE ON public.caixa_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_caixa_totais();

-- Audit triggers
CREATE TRIGGER trg_audit_caixa_diario
AFTER INSERT OR UPDATE OR DELETE ON public.caixa_diario
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_caixa_movimentacoes
AFTER INSERT OR UPDATE OR DELETE ON public.caixa_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
