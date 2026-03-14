
-- Create a secure function for clients to get PIX data only
CREATE OR REPLACE FUNCTION public.get_pix_config(_empresa_id uuid)
RETURNS TABLE(pix_chave text, pix_tipo text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT c.pix_chave, c.pix_tipo
  FROM public.configuracoes c
  WHERE c.empresa_id = _empresa_id
  LIMIT 1;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.get_pix_config(uuid) TO authenticated;
