CREATE OR REPLACE FUNCTION fn_get_default_vendedor_id(p_empresa_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendedor_id uuid;
BEGIN
  -- Tentar admin ou gerente primeiro
  SELECT user_id INTO v_vendedor_id
  FROM user_roles
  WHERE empresa_id = p_empresa_id AND role IN ('admin', 'gerente')
  LIMIT 1;
  
  -- Se não achar, pega qualquer vendedor disponivel na empresa
  IF v_vendedor_id IS NULL THEN
    SELECT user_id INTO v_vendedor_id
    FROM user_roles
    WHERE empresa_id = p_empresa_id AND role = 'vendedor'
    LIMIT 1;
  END IF;

  RETURN v_vendedor_id;
END;
$$;
