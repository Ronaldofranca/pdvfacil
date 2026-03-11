
-- Pagamentos
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  parcela_id UUID NOT NULL REFERENCES public.parcelas(id) ON DELETE CASCADE,
  valor_pago NUMERIC(12,2) NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT '',
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pagamentos: select own empresa" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Pagamentos: insert own empresa" ON public.pagamentos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.has_permission('registrar_pagamento'));

CREATE POLICY "Pagamentos: delete admin only" ON public.pagamentos
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Trigger: ao inserir pagamento, atualizar valor_pago na parcela
CREATE OR REPLACE FUNCTION public.fn_atualizar_parcela_pagamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.parcelas
  SET valor_pago = (
    SELECT COALESCE(SUM(p.valor_pago), 0)
    FROM public.pagamentos p
    WHERE p.parcela_id = NEW.parcela_id
  )
  WHERE id = NEW.parcela_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pagamento_atualiza_parcela
  AFTER INSERT ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_atualizar_parcela_pagamento();
