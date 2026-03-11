-- =============================================
-- MIGRATION 004: Auto-create profile on signup
-- =============================================

-- Trigger function: cria profile quando novo user é criado
-- NOTA: empresa_id deve ser passada nos user_metadata no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _empresa_id uuid;
BEGIN
  _empresa_id := (NEW.raw_user_meta_data ->> 'empresa_id')::uuid;

  -- Cria profile
  INSERT INTO public.profiles (user_id, empresa_id, nome, email)
  VALUES (
    NEW.id,
    _empresa_id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- Atribui role padrão (vendedor)
  INSERT INTO public.user_roles (user_id, empresa_id, role)
  VALUES (NEW.id, _empresa_id, 'vendedor');

  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
