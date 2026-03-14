-- Backup history/log table
CREATE TABLE public.backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'manual',
  tabelas text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pendente',
  arquivo_url text,
  tamanho_bytes bigint DEFAULT 0,
  registros_total integer DEFAULT 0,
  erro text,
  verificado boolean NOT NULL DEFAULT false,
  verificado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BackupLogs: select admin" ON public.backup_logs
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "BackupLogs: insert admin" ON public.backup_logs
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "BackupLogs: update admin" ON public.backup_logs
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "BackupLogs: delete admin" ON public.backup_logs
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE INDEX idx_backup_logs_empresa ON public.backup_logs(empresa_id);
CREATE INDEX idx_backup_logs_created ON public.backup_logs(created_at DESC);