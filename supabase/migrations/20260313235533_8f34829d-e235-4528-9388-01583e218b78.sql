
CREATE OR REPLACE FUNCTION public.get_my_cliente_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.clientes WHERE user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_cliente()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'cliente') $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE _empresa_id uuid; _role app_role;
BEGIN
  _empresa_id := (NEW.raw_user_meta_data ->> 'empresa_id')::uuid;
  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'vendedor');
  INSERT INTO public.profiles (user_id, empresa_id, nome, email)
  VALUES (NEW.id, _empresa_id, COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)), NEW.email);
  INSERT INTO public.user_roles (user_id, empresa_id, role) VALUES (NEW.id, _empresa_id, _role);
  IF _role = 'cliente' AND NEW.raw_user_meta_data ->> 'cliente_id' IS NOT NULL THEN
    UPDATE public.clientes SET user_id = NEW.id WHERE id = (NEW.raw_user_meta_data ->> 'cliente_id')::uuid AND empresa_id = _empresa_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE POLICY "pedidos_client_scope" ON public.pedidos AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
CREATE POLICY "pedidos_client_insert_scope" ON public.pedidos AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
CREATE POLICY "pedidos_client_no_update" ON public.pedidos AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "pedidos_client_no_delete" ON public.pedidos AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "itens_pedido_client_scope" ON public.itens_pedido AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = itens_pedido.pedido_id AND p.cliente_id = public.get_my_cliente_id()));
CREATE POLICY "itens_pedido_client_insert_scope" ON public.itens_pedido AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_cliente() OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = itens_pedido.pedido_id AND p.cliente_id = public.get_my_cliente_id()));
CREATE POLICY "itens_pedido_client_no_update" ON public.itens_pedido AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "itens_pedido_client_no_delete" ON public.itens_pedido AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "parcelas_client_scope" ON public.parcelas AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
CREATE POLICY "parcelas_client_no_insert" ON public.parcelas AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_cliente());
CREATE POLICY "parcelas_client_no_update" ON public.parcelas AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "parcelas_client_no_delete" ON public.parcelas AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "vendas_client_scope" ON public.vendas AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
CREATE POLICY "vendas_client_no_insert" ON public.vendas AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_cliente());
CREATE POLICY "vendas_client_no_update" ON public.vendas AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "itens_venda_client_scope" ON public.itens_venda AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = itens_venda.venda_id AND v.cliente_id = public.get_my_cliente_id()));
CREATE POLICY "itens_venda_client_no_insert" ON public.itens_venda AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_cliente());
CREATE POLICY "historico_client_scope" ON public.historico_compras AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
CREATE POLICY "clientes_client_scope" ON public.clientes AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR user_id = auth.uid());
CREATE POLICY "clientes_client_no_insert" ON public.clientes AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_cliente());
CREATE POLICY "clientes_client_no_update" ON public.clientes AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "audit_client_block" ON public.audit_logs AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "empresas_client_block" ON public.empresas AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "caixa_diario_client_block" ON public.caixa_diario AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "caixa_mov_client_block" ON public.caixa_movimentacoes AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "conciliacoes_client_block" ON public.conciliacoes AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "conciliacao_itens_client_block" ON public.conciliacao_itens AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "metas_client_block" ON public.metas_vendedor AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "movimentos_client_block" ON public.movimentos_estoque AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "estoque_client_block" ON public.estoque AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "notificacoes_client_block" ON public.notificacoes AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "pagamentos_client_block" ON public.pagamentos AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "historico_cobrancas_client_block" ON public.historico_cobrancas AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente());
CREATE POLICY "profiles_client_scope" ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR user_id = auth.uid());
CREATE POLICY "user_roles_client_scope" ON public.user_roles AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR user_id = auth.uid());
CREATE POLICY "user_roles_client_no_insert" ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_cliente());
CREATE POLICY "produtos_client_active_only" ON public.produtos AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR ativo = true);
CREATE POLICY "categorias_client_active_only" ON public.categorias AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_cliente() OR ativa = true);
