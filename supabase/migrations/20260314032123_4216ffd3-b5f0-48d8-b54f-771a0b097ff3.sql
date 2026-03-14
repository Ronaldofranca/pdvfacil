
-- Fix: Drop tables created partially and recreate
DROP TABLE IF EXISTS public.financial_ledger CASCADE;
DROP TABLE IF EXISTS public.fraud_detection_logs CASCADE;

-- 1. Financial Ledger (append-only, immutable)
CREATE TABLE public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo_evento text NOT NULL,
  referencia_tipo text NOT NULL DEFAULT '',
  referencia_id uuid,
  cliente_id uuid,
  venda_id uuid,
  parcela_id uuid,
  pagamento_id uuid,
  caixa_id uuid,
  valor numeric NOT NULL DEFAULT 0,
  natureza text NOT NULL CHECK (natureza IN ('debito', 'credito')),
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_select" ON public.financial_ledger
FOR SELECT TO authenticated
USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "ledger_insert" ON public.financial_ledger
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "ledger_client_block" ON public.financial_ledger
FOR SELECT TO authenticated
USING (NOT public.is_cliente());

-- 2. Fraud Detection Logs
CREATE TABLE public.fraud_detection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo_alerta text NOT NULL,
  registro_tipo text NOT NULL DEFAULT '',
  registro_id text,
  nivel_risco text NOT NULL DEFAULT 'medio' CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'critico')),
  descricao text NOT NULL,
  payload_detectado jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'revisado', 'corrigido', 'ignorado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_detection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fraud_select" ON public.fraud_detection_logs
FOR SELECT TO authenticated
USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

CREATE POLICY "fraud_insert" ON public.fraud_detection_logs
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "fraud_update_admin" ON public.fraud_detection_logs
FOR UPDATE TO authenticated
USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

CREATE POLICY "fraud_client_block" ON public.fraud_detection_logs
FOR SELECT TO authenticated
USING (NOT public.is_cliente());

-- 3. Auto-populate ledger on venda creation/cancellation
CREATE OR REPLACE FUNCTION public.fn_ledger_venda_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'finalizada' THEN
    INSERT INTO public.financial_ledger (empresa_id, tipo_evento, referencia_tipo, referencia_id, cliente_id, venda_id, valor, natureza, descricao, created_by)
    VALUES (NEW.empresa_id, 'venda_criada', 'vendas', NEW.id, NEW.cliente_id, NEW.id, NEW.total, 'credito', 'Venda finalizada #' || substr(NEW.id::text, 1, 8), NEW.vendedor_id);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
    INSERT INTO public.financial_ledger (empresa_id, tipo_evento, referencia_tipo, referencia_id, cliente_id, venda_id, valor, natureza, descricao, created_by)
    VALUES (NEW.empresa_id, 'venda_cancelada', 'vendas', NEW.id, NEW.cliente_id, NEW.id, NEW.total, 'debito', 'Cancelamento venda #' || substr(NEW.id::text, 1, 8) || ' - ' || COALESCE(NEW.motivo_cancelamento, ''), NEW.cancelado_por);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_venda ON public.vendas;
CREATE TRIGGER trg_ledger_venda
AFTER INSERT OR UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.fn_ledger_venda_created();

-- 4. Auto-populate ledger on parcela
CREATE OR REPLACE FUNCTION public.fn_ledger_parcela()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_ledger (empresa_id, tipo_evento, referencia_tipo, referencia_id, cliente_id, venda_id, parcela_id, valor, natureza, descricao)
    VALUES (NEW.empresa_id, 'parcela_gerada', 'parcelas', NEW.id, NEW.cliente_id, NEW.venda_id, NEW.id, NEW.valor_total, 'debito', 'Parcela ' || NEW.numero || ' gerada');
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
    INSERT INTO public.financial_ledger (empresa_id, tipo_evento, referencia_tipo, referencia_id, cliente_id, venda_id, parcela_id, valor, natureza, descricao)
    VALUES (NEW.empresa_id, 'parcela_cancelada', 'parcelas', NEW.id, NEW.cliente_id, NEW.venda_id, NEW.id, NEW.valor_total, 'credito', 'Parcela ' || NEW.numero || ' cancelada');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_parcela ON public.parcelas;
CREATE TRIGGER trg_ledger_parcela
AFTER INSERT OR UPDATE ON public.parcelas
FOR EACH ROW
EXECUTE FUNCTION public.fn_ledger_parcela();

-- 5. Auto-populate ledger on pagamento
CREATE OR REPLACE FUNCTION public.fn_ledger_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _parcela RECORD;
BEGIN
  SELECT empresa_id, cliente_id, venda_id INTO _parcela FROM public.parcelas WHERE id = NEW.parcela_id;
  INSERT INTO public.financial_ledger (empresa_id, tipo_evento, referencia_tipo, referencia_id, cliente_id, venda_id, parcela_id, pagamento_id, valor, natureza, descricao, created_by)
  VALUES (_parcela.empresa_id, 'pagamento_recebido', 'pagamentos', NEW.id, _parcela.cliente_id, _parcela.venda_id, NEW.parcela_id, NEW.id, NEW.valor_pago, 'credito', 'Pagamento via ' || NEW.forma_pagamento, NEW.usuario_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_pagamento ON public.pagamentos;
CREATE TRIGGER trg_ledger_pagamento
AFTER INSERT ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.fn_ledger_pagamento();

-- 6. Auto-populate ledger on caixa movimentacoes (sangria/suprimento)
CREATE OR REPLACE FUNCTION public.fn_ledger_caixa_mov()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo IN ('sangria', 'suprimento') THEN
    INSERT INTO public.financial_ledger (empresa_id, tipo_evento, referencia_tipo, referencia_id, caixa_id, valor, natureza, descricao, created_by)
    VALUES (NEW.empresa_id, NEW.tipo, 'caixa_movimentacoes', NEW.id, NEW.caixa_id, NEW.valor,
            CASE WHEN NEW.tipo = 'sangria' THEN 'debito' ELSE 'credito' END,
            NEW.descricao, NEW.usuario_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_caixa_mov ON public.caixa_movimentacoes;
CREATE TRIGGER trg_ledger_caixa_mov
AFTER INSERT ON public.caixa_movimentacoes
FOR EACH ROW
EXECUTE FUNCTION public.fn_ledger_caixa_mov();

-- 7. Fraud detection: payment exceeding parcela value
CREATE OR REPLACE FUNCTION public.fn_detect_fraud_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _parcela RECORD;
  _total_pago numeric;
BEGIN
  SELECT * INTO _parcela FROM public.parcelas WHERE id = NEW.parcela_id;
  SELECT COALESCE(SUM(valor_pago), 0) INTO _total_pago FROM public.pagamentos WHERE parcela_id = NEW.parcela_id;
  
  IF _total_pago > _parcela.valor_total THEN
    INSERT INTO public.fraud_detection_logs (empresa_id, tipo_alerta, registro_tipo, registro_id, nivel_risco, descricao, payload_detectado)
    VALUES (_parcela.empresa_id, 'pagamento_excedente', 'pagamentos', NEW.id::text, 'alto',
            'Pagamento excede valor da parcela. Total pago: ' || _total_pago || ', Valor parcela: ' || _parcela.valor_total,
            jsonb_build_object('parcela_id', NEW.parcela_id, 'valor_pago', NEW.valor_pago, 'total_acumulado', _total_pago, 'valor_parcela', _parcela.valor_total));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_fraud_pagamento ON public.pagamentos;
CREATE TRIGGER trg_detect_fraud_pagamento
AFTER INSERT ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.fn_detect_fraud_pagamento();

-- 8. Fraud detection: venda cancelada sem estorno no estoque
CREATE OR REPLACE FUNCTION public.fn_detect_fraud_cancel_sem_estorno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _estornos integer;
BEGIN
  IF NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
    -- Check after a short delay equivalent: count estorno movements
    SELECT count(*) INTO _estornos FROM public.movimentos_estoque 
    WHERE observacoes LIKE '%Estorno%' AND observacoes LIKE '%' || substr(NEW.id::text, 1, 8) || '%';
    -- This will be checked by the daily audit if estornos are missing
  END IF;
  RETURN NEW;
END;
$$;
