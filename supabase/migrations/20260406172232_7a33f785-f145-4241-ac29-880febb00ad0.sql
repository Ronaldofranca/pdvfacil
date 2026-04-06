
-- Update fn_get_cidades_publicas to also return representative email
DROP FUNCTION IF EXISTS public.fn_get_cidades_publicas();

CREATE OR REPLACE FUNCTION public.fn_get_cidades_publicas()
RETURNS TABLE(
  id uuid,
  cidade text,
  estado text,
  latitude numeric,
  longitude numeric,
  representante_nome text,
  representante_telefone text,
  representante_email text,
  representante_cor text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.cidade,
    c.estado,
    c.latitude,
    c.longitude,
    r.nome as representante_nome,
    r.telefone as representante_telefone,
    r.email as representante_email,
    r.cor as representante_cor
  FROM public.cidades_atendidas c
  LEFT JOIN public.representantes r ON c.representante_id = r.id
  WHERE c.ativa = true;
END;
$$;
