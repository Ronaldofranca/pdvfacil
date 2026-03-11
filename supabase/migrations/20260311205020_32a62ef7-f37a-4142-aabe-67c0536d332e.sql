
-- Fix security definer view - use security_invoker instead
DROP VIEW IF EXISTS public.produtos_catalogo;

CREATE OR REPLACE VIEW public.produtos_catalogo
WITH (security_invoker = on) AS
  SELECT 
    id, empresa_id, nome, descricao, codigo, categoria_id, preco, unidade,
    imagem_url, ativo, slug, seo_titulo, seo_descricao, beneficios,
    destaque, lancamento, mais_vendido, promocao, whatsapp_texto,
    created_at, updated_at
  FROM public.produtos
  WHERE ativo = true;

GRANT SELECT ON public.produtos_catalogo TO anon;
GRANT SELECT ON public.produtos_catalogo TO authenticated;
