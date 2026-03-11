-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor');

-- 2. Tabela empresas
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  razao_social text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  logo_url text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 3. Tabela profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  avatar_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Tabela user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Tabela permissoes
CREATE TABLE public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;

-- 6. Tabela role_permissoes
CREATE TABLE public.role_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permissao_id uuid REFERENCES public.permissoes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permissao_id)
);
ALTER TABLE public.role_permissoes ENABLE ROW LEVEL SECURITY;

-- 7. Seed de permissões
INSERT INTO public.permissoes (nome, descricao) VALUES
  ('criar_venda', 'Criar novos pedidos de venda'),
  ('editar_produto', 'Editar cadastro de produtos'),
  ('ver_relatorios', 'Visualizar relatórios gerenciais'),
  ('registrar_pagamento', 'Registrar pagamentos e recebimentos'),
  ('gerenciar_vendedores', 'Gerenciar equipe de vendedores');

-- 8. Seed de permissões por role
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'admin'::public.app_role, id FROM public.permissoes;

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'gerente'::public.app_role, id FROM public.permissoes
WHERE nome IN ('criar_venda', 'ver_relatorios', 'registrar_pagamento', 'gerenciar_vendedores');

INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'vendedor'::public.app_role, id FROM public.permissoes
WHERE nome IN ('criar_venda');

-- 9. Helper functions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND empresa_id = public.get_my_empresa_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_gerente()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'gerente')
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_permission_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissoes rp ON rp.role = ur.role
    JOIN public.permissoes p ON p.id = rp.permissao_id
    WHERE ur.user_id = auth.uid()
      AND ur.empresa_id = public.get_my_empresa_id()
      AND p.nome = _permission_name
  )
$$;

-- 10. RLS Policies
CREATE POLICY "Users can view own empresa" ON public.empresas FOR SELECT TO authenticated USING (id = public.get_my_empresa_id());
CREATE POLICY "Users can view profiles in same empresa" ON public.profiles FOR SELECT TO authenticated USING (empresa_id = public.get_my_empresa_id());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view roles in same empresa" ON public.user_roles FOR SELECT TO authenticated USING (empresa_id = public.get_my_empresa_id());
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND empresa_id = public.get_my_empresa_id() AND user_id != auth.uid());
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin() AND empresa_id = public.get_my_empresa_id());

CREATE POLICY "Authenticated users can view permissoes" ON public.permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view role_permissoes" ON public.role_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage role_permissoes" ON public.role_permissoes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Only admins can delete role_permissoes" ON public.role_permissoes FOR DELETE TO authenticated USING (public.is_admin());

-- 11. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _empresa_id uuid;
BEGIN
  _empresa_id := (NEW.raw_user_meta_data ->> 'empresa_id')::uuid;
  INSERT INTO public.profiles (user_id, empresa_id, nome, email)
  VALUES (NEW.id, _empresa_id, COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)), NEW.email);
  INSERT INTO public.user_roles (user_id, empresa_id, role) VALUES (NEW.id, _empresa_id, 'vendedor');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();