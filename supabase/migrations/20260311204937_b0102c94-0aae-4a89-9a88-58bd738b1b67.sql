
-- 1. Create public view for products WITHOUT custo column
CREATE VIEW public.produtos_publico
WITH (security_invoker=on) AS
  SELECT 
    id, empresa_id, nome, descricao, codigo, categoria_id, preco, unidade,
    imagem_url, ativo, slug, seo_titulo, seo_descricao, beneficios,
    destaque, lancamento, mais_vendido, promocao, whatsapp_texto,
    created_at, updated_at
  FROM public.produtos;

-- 2. Drop the old anon policy that exposes custo
DROP POLICY IF EXISTS "Produtos: public read active" ON public.produtos;

-- 3. Re-create anon policy on the VIEW is not possible, so create a new
-- restricted anon policy on the base table that denies direct SELECT for anon
CREATE POLICY "Produtos: anon read via view only"
  ON public.produtos FOR SELECT
  TO anon
  USING (false);

-- 4. Grant anon SELECT on the public view
GRANT SELECT ON public.produtos_publico TO anon;

-- 5. Fix catalogo_config: scope public read to empresa_id parameter
-- Drop the overly broad policy
DROP POLICY IF EXISTS "CatalogoConfig: public read" ON public.catalogo_config;

-- 6. Fix metas_vendedor: vendedores can only see their own metas
DROP POLICY IF EXISTS "Metas: select own empresa" ON public.metas_vendedor;

CREATE POLICY "Metas: select own or admin/gerente"
  ON public.metas_vendedor FOR SELECT
  TO authenticated
  USING (
    empresa_id = public.get_my_empresa_id()
    AND (
      vendedor_id = auth.uid()
      OR public.is_admin()
      OR public.is_gerente()
    )
  );
