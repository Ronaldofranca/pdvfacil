
-- Table to track billing/collection history
CREATE TABLE public.historico_cobrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  parcela_id uuid REFERENCES public.parcelas(id),
  data_envio timestamp with time zone NOT NULL DEFAULT now(),
  tipo_cobranca text NOT NULL DEFAULT 'whatsapp',
  mensagem text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HistoricoCobrancas: select own empresa"
  ON public.historico_cobrancas FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "HistoricoCobrancas: insert own empresa"
  ON public.historico_cobrancas FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "HistoricoCobrancas: delete admin only"
  ON public.historico_cobrancas FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

-- Index for quick lookups
CREATE INDEX idx_historico_cobrancas_cliente ON public.historico_cobrancas(cliente_id);
CREATE INDEX idx_historico_cobrancas_parcela ON public.historico_cobrancas(parcela_id);

-- Add ultima_cobranca field to parcelas
ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS ultima_cobranca timestamp with time zone;
