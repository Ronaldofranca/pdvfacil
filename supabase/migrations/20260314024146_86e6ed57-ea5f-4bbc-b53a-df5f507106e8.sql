-- 1) Restrictive policy on uso_pontos: clients only see own records
CREATE POLICY "uso_pontos_client_scope" ON public.uso_pontos
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((NOT is_cliente()) OR (cliente_id = get_my_cliente_id()));

-- 2) Block client INSERT on uso_pontos
CREATE POLICY "uso_pontos_client_no_insert" ON public.uso_pontos
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT is_cliente());

-- 3) Block client DELETE on uso_pontos
CREATE POLICY "uso_pontos_client_no_delete" ON public.uso_pontos
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT is_cliente());

-- 4) Block client reads on role_permissoes
CREATE POLICY "role_permissoes_client_block" ON public.role_permissoes
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT is_cliente());

-- 5) Block client reads on permissoes
CREATE POLICY "permissoes_client_block" ON public.permissoes
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT is_cliente());