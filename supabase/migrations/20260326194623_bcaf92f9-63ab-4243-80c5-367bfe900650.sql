
CREATE OR REPLACE FUNCTION public.get_public_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.empresas e
  INNER JOIN public.configuracoes c ON c.empresa_id = e.id
  WHERE e.ativa = true
    AND c.catalogo_publico_ativo = true
  ORDER BY e.created_at ASC
  LIMIT 1;
$$;
