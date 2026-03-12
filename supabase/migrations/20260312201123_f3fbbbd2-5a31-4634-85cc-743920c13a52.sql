CREATE POLICY "Catalogo: auth read own empresa"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'catalogo' AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text);