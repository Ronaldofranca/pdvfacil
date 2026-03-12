-- Remove anon access to base produtos table (exposes custo column)
DROP POLICY IF EXISTS "Produtos: public read active" ON public.produtos;

-- Create restrictive anon policy on base table (deny all)
CREATE POLICY "Produtos: anon denied on base table"
  ON public.produtos
  FOR SELECT
  TO anon
  USING (false);

-- Grant anon SELECT on the safe view (excludes custo)
GRANT SELECT ON public.produtos_catalogo TO anon;