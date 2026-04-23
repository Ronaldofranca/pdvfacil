-- Function to safely fetch a default seller for a client portal order
CREATE OR REPLACE FUNCTION fn_get_default_vendedor_id(p_empresa_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendedor_id uuid;
BEGIN
  -- First try to find an admin or owner
  SELECT user_id INTO v_vendedor_id
  FROM user_roles
  WHERE empresa_id = p_empresa_id AND role IN ('admin', 'dono')
  LIMIT 1;
  
  -- If no admin, try any employee
  IF v_vendedor_id IS NULL THEN
    SELECT user_id INTO v_vendedor_id
    FROM user_roles
    WHERE empresa_id = p_empresa_id AND role = 'funcionario'
    LIMIT 1;
  END IF;

  RETURN v_vendedor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_default_vendedor_id(uuid) TO authenticated;
