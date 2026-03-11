
-- ═══════════════════════════════════════════════
-- 1. NOTIFICACOES TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'info',
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notificacoes: select own" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id() AND usuario_id = auth.uid());

CREATE POLICY "Notificacoes: insert own empresa" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Notificacoes: update own" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Notificacoes: delete own" ON public.notificacoes
  FOR DELETE TO authenticated
  USING (usuario_id = auth.uid());

-- ═══════════════════════════════════════════════
-- 2. AUDIT_LOGS TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid,
  acao text NOT NULL,
  tabela text NOT NULL,
  registro_id text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit: select admin only" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "Audit: insert own empresa" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

-- ═══════════════════════════════════════════════
-- 3. SECURITY_LOGS TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid,
  evento text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  ip text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security logs: select admin only" ON public.security_logs
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "Security logs: insert" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- 4. DEVICES TABLE (for offline sync)
-- ═══════════════════════════════════════════════
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  device_id text NOT NULL,
  nome text NOT NULL DEFAULT '',
  ultimo_sync timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, device_id)
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devices: select own" ON public.devices
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Devices: upsert own" ON public.devices
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND empresa_id = get_my_empresa_id());

CREATE POLICY "Devices: update own" ON public.devices
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid());

-- ═══════════════════════════════════════════════
-- 5. SYNC_QUEUE TABLE (server-side sync queue)
-- ═══════════════════════════════════════════════
CREATE TABLE public.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  device_id text NOT NULL,
  tabela text NOT NULL,
  operacao text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sync queue: select own" ON public.sync_queue
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() AND empresa_id = get_my_empresa_id());

CREATE POLICY "Sync queue: insert own" ON public.sync_queue
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND empresa_id = get_my_empresa_id());

CREATE POLICY "Sync queue: update own" ON public.sync_queue
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid());

-- ═══════════════════════════════════════════════
-- 6. ENDERECOS TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE public.enderecos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'principal',
  rua text NOT NULL DEFAULT '',
  numero text NOT NULL DEFAULT '',
  complemento text NOT NULL DEFAULT '',
  bairro text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT '',
  cep text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enderecos: select own empresa" ON public.enderecos
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Enderecos: insert own empresa" ON public.enderecos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Enderecos: update own empresa" ON public.enderecos
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Enderecos: delete own empresa" ON public.enderecos
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

-- ═══════════════════════════════════════════════
-- 7. ROMANEIOS TABLE (persistent)
-- ═══════════════════════════════════════════════
CREATE TABLE public.romaneios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto',
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.romaneios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Romaneios: select own empresa" ON public.romaneios
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Romaneios: insert own empresa" ON public.romaneios
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Romaneios: update own empresa" ON public.romaneios
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id());

-- ═══════════════════════════════════════════════
-- 8. ROMANEIO_VENDAS TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE public.romaneio_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  romaneio_id uuid NOT NULL REFERENCES public.romaneios(id) ON DELETE CASCADE,
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(romaneio_id, venda_id)
);

ALTER TABLE public.romaneio_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Romaneio vendas: select via romaneio" ON public.romaneio_vendas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.romaneios r
    WHERE r.id = romaneio_vendas.romaneio_id AND r.empresa_id = get_my_empresa_id()
  ));

CREATE POLICY "Romaneio vendas: insert via romaneio" ON public.romaneio_vendas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.romaneios r
    WHERE r.id = romaneio_vendas.romaneio_id AND r.empresa_id = get_my_empresa_id()
  ));

-- ═══════════════════════════════════════════════
-- 9. AUDIT LOG TRIGGER FUNCTION
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _empresa_id uuid;
  _action text;
  _old jsonb;
  _new jsonb;
  _record_id text;
BEGIN
  _action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _new := NULL;
    _record_id := OLD.id::text;
    _empresa_id := OLD.empresa_id;
  ELSIF TG_OP = 'INSERT' THEN
    _old := NULL;
    _new := to_jsonb(NEW);
    _record_id := NEW.id::text;
    _empresa_id := NEW.empresa_id;
  ELSE
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _record_id := NEW.id::text;
    _empresa_id := NEW.empresa_id;
  END IF;

  INSERT INTO public.audit_logs (empresa_id, usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos)
  VALUES (_empresa_id, auth.uid(), _action, TG_TABLE_NAME, _record_id, _old, _new);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Attach audit triggers to critical tables
CREATE TRIGGER trg_audit_vendas AFTER INSERT OR UPDATE OR DELETE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_clientes AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_produtos AFTER INSERT OR UPDATE OR DELETE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_parcelas AFTER INSERT OR UPDATE OR DELETE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_pagamentos AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_estoque AFTER INSERT OR UPDATE OR DELETE ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- ═══════════════════════════════════════════════
-- 10. ADD EMPRESAS INSERT/UPDATE POLICIES FOR ADMIN
-- ═══════════════════════════════════════════════
CREATE POLICY "Admins can insert empresas" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update own empresa" ON public.empresas
  FOR UPDATE TO authenticated
  USING (id = get_my_empresa_id() AND is_admin())
  WITH CHECK (id = get_my_empresa_id());
