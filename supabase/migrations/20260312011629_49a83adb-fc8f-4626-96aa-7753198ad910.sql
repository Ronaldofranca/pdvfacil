-- Fix 1: Storage tenant isolation for catalogo bucket
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Catalogo: auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Catalogo: auth update" ON storage.objects;
DROP POLICY IF EXISTS "Catalogo: auth delete" ON storage.objects;

-- Recreate with tenant isolation (files must be stored under empresa_id/ prefix)
CREATE POLICY "Catalogo: auth upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'catalogo'
    AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
  );

CREATE POLICY "Catalogo: auth update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'catalogo'
    AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
  );

CREATE POLICY "Catalogo: auth delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'catalogo'
    AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
  );

-- Fix 2: Tighten security_logs INSERT policy
DROP POLICY IF EXISTS "Security logs: insert" ON public.security_logs;
DROP POLICY IF EXISTS "Security logs: insert own empresa" ON public.security_logs;

CREATE POLICY "Security logs: insert own empresa" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND empresa_id = public.get_my_empresa_id()
  );