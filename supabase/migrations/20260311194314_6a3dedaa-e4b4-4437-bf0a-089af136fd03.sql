
DROP POLICY "Security logs: insert" ON public.security_logs;
CREATE POLICY "Security logs: insert own empresa" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id());
