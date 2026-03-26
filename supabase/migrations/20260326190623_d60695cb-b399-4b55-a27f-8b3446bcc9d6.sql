ALTER TABLE public.catalogo_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CatalogoBanners: select own empresa" ON public.catalogo_banners;
DROP POLICY IF EXISTS "CatalogoBanners: insert admin" ON public.catalogo_banners;
DROP POLICY IF EXISTS "CatalogoBanners: update admin" ON public.catalogo_banners;
DROP POLICY IF EXISTS "CatalogoBanners: delete admin" ON public.catalogo_banners;
DROP POLICY IF EXISTS "CatalogoBanners: public active banners" ON public.catalogo_banners;

CREATE POLICY "CatalogoBanners: select own empresa"
ON public.catalogo_banners
FOR SELECT
TO authenticated
USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "CatalogoBanners: insert admin"
ON public.catalogo_banners
FOR INSERT
TO authenticated
WITH CHECK (
  empresa_id = public.get_my_empresa_id()
  AND (public.is_admin() OR public.is_gerente())
);

CREATE POLICY "CatalogoBanners: update admin"
ON public.catalogo_banners
FOR UPDATE
TO authenticated
USING (
  empresa_id = public.get_my_empresa_id()
  AND (public.is_admin() OR public.is_gerente())
)
WITH CHECK (
  empresa_id = public.get_my_empresa_id()
  AND (public.is_admin() OR public.is_gerente())
);

CREATE POLICY "CatalogoBanners: delete admin"
ON public.catalogo_banners
FOR DELETE
TO authenticated
USING (
  empresa_id = public.get_my_empresa_id()
  AND public.is_admin()
);

CREATE POLICY "CatalogoBanners: public active banners"
ON public.catalogo_banners
FOR SELECT
TO anon
USING (
  ativo IS TRUE
  AND empresa_id = public.get_public_empresa_id()
);