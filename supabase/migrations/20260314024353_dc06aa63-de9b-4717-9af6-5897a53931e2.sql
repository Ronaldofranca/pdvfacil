-- Create backups storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only admins can read/write backups
CREATE POLICY "Backups: admin upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Backups: admin select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Backups: admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'backups' AND is_admin());

-- Service role access for edge functions (service_role bypasses RLS)