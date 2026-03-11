
-- Create a trigger to auto-promote contatonutary@gmail.com to admin
CREATE OR REPLACE FUNCTION public.fn_promote_admin_nutary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.email = 'contatonutary@gmail.com' THEN
    UPDATE public.user_roles
    SET role = 'admin'
    WHERE user_id = NEW.user_id AND empresa_id = NEW.empresa_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_promote_admin_nutary
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_promote_admin_nutary();
