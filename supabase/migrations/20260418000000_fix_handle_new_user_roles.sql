-- Redefine handle_new_user to correctly read role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE 
  _empresa_id uuid;
  _role text;
BEGIN
  _empresa_id := (NEW.raw_user_meta_data ->> 'empresa_id')::uuid;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, empresa_id, nome, email, cargo)
  VALUES (
    NEW.id, 
    _empresa_id, 
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)), 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'cargo', '')
  );

  -- Determine role from metadata
  _role := NEW.raw_user_meta_data ->> 'role';
  
  -- If role is provided, insert it. 
  -- We don't default to 'vendedor' here anymore to avoid incorrect assignments for portal customers.
  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, empresa_id, role) 
    VALUES (NEW.id, _empresa_id, _role::public.app_role)
    ON CONFLICT (user_id, empresa_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
