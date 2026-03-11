
-- Status parcela
CREATE TYPE public.status_parcela AS ENUM ('pendente','paga','vencida');

-- Parcelas
CREATE TABLE public.parcelas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  numero INTEGER NOT NULL DEFAULT 1,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(12,2) GENERATED ALWAYS AS (valor_total - valor_pago) STORED,
  vencimento DATE NOT NULL,
  status status_parcela NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parcelas: select own empresa" ON public.parcelas
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Parcelas: insert own empresa" ON public.parcelas
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Parcelas: update own empresa" ON public.parcelas
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Parcelas: delete admin only" ON public.parcelas
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Trigger: auto-set status to 'paga' when valor_pago >= valor_total, 'vencida' if past due
CREATE OR REPLACE FUNCTION public.fn_parcela_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.valor_pago >= NEW.valor_total THEN
    NEW.status := 'paga';
    IF NEW.data_pagamento IS NULL THEN
      NEW.data_pagamento := now();
    END IF;
  ELSIF NEW.vencimento < CURRENT_DATE AND NEW.status = 'pendente' THEN
    NEW.status := 'vencida';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_parcela_status
  BEFORE INSERT OR UPDATE ON public.parcelas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_parcela_status();
