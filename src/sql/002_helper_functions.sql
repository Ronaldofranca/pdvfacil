-- =============================================
-- MIGRATION 002: Helper functions (SECURITY DEFINER)
-- =============================================

-- get_my_empresa_id: retorna empresa_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- has_role: verifica se um usuário tem determinada role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND empresa_id = public.get_my_empresa_id()
  )
$$;

-- is_admin: atalho
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- is_gerente: atalho
CREATE OR REPLACE FUNCTION public.is_gerente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'gerente')
$$;

-- has_permission: verifica se usuário tem uma permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(_permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissoes rp ON rp.role = ur.role
    JOIN public.permissoes p ON p.id = rp.permissao_id
    WHERE ur.user_id = auth.uid()
      AND ur.empresa_id = public.get_my_empresa_id()
      AND p.nome = _permission_name
  )
$$;
