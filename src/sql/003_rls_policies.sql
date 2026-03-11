-- =============================================
-- MIGRATION 003: RLS Policies
-- =============================================

-- === EMPRESAS ===
CREATE POLICY "Users can view own empresa"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (id = public.get_my_empresa_id());

-- === PROFILES ===
CREATE POLICY "Users can view profiles in same empresa"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- === USER_ROLES ===
CREATE POLICY "Users can view roles in same empresa"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND empresa_id = public.get_my_empresa_id()
    AND user_id != auth.uid()  -- prevent self-escalation
  );

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin() AND empresa_id = public.get_my_empresa_id());

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin() AND empresa_id = public.get_my_empresa_id());

-- === PERMISSOES ===
CREATE POLICY "Authenticated users can view permissoes"
  ON public.permissoes FOR SELECT
  TO authenticated
  USING (true);

-- === ROLE_PERMISSOES ===
CREATE POLICY "Authenticated users can view role_permissoes"
  ON public.role_permissoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage role_permissoes"
  ON public.role_permissoes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete role_permissoes"
  ON public.role_permissoes FOR DELETE
  TO authenticated
  USING (public.is_admin());
