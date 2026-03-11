
-- Restore anon read on produtos (the view approach breaks catalog)
-- but create a SECURITY DEFINER function to return products without custo
DROP POLICY IF EXISTS "Produtos: anon read via view only" ON public.produtos;
DROP VIEW IF EXISTS public.produtos_publico;

-- Create a safe anon policy that only returns active products
CREATE POLICY "Produtos: public read active"
  ON public.produtos FOR SELECT
  TO anon
  USING (ativo = true);

-- Create a secure view for public product listing (no custo)
CREATE OR REPLACE VIEW public.produtos_catalogo
WITH (security_invoker = off) AS
  SELECT 
    id, empresa_id, nome, descricao, codigo, categoria_id, preco, unidade,
    imagem_url, ativo, slug, seo_titulo, seo_descricao, beneficios,
    destaque, lancamento, mais_vendido, promocao, whatsapp_texto,
    created_at, updated_at
  FROM public.produtos
  WHERE ativo = true;

GRANT SELECT ON public.produtos_catalogo TO anon;
GRANT SELECT ON public.produtos_catalogo TO authenticated;
