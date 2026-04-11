
-- 1. Fix itens_devolucao: remove public policies and restrict to authenticated
DROP POLICY IF EXISTS "Visualização de itens de devolução" ON public.itens_devolucao;
DROP POLICY IF EXISTS "Itens Devolução: Acesso apenas para autenticados" ON public.itens_devolucao;
DROP POLICY IF EXISTS "itens_devolucao_select" ON public.itens_devolucao;
DROP POLICY IF EXISTS "itens_devolucao_insert" ON public.itens_devolucao;
DROP POLICY IF EXISTS "itens_devolucao_update" ON public.itens_devolucao;

CREATE POLICY "itens_devolucao_select"
  ON public.itens_devolucao FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "itens_devolucao_insert"
  ON public.itens_devolucao FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "itens_devolucao_update"
  ON public.itens_devolucao FOR UPDATE
  TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

-- 2. Fix cliente_merges: fix broken admin policy
DROP POLICY IF EXISTS "Apenas admins gerenciam merges" ON public.cliente_merges;
DROP POLICY IF EXISTS "cliente_merges_admin" ON public.cliente_merges;

CREATE POLICY "cliente_merges_admin"
  ON public.cliente_merges FOR ALL
  TO authenticated
  USING (public.is_admin() AND empresa_id = public.get_my_empresa_id());

-- 3. Fix profiles_final: remove overly permissive SELECT
DROP POLICY IF EXISTS "profiles_final" ON public.profiles;

-- 4. Fix functions missing search_path
ALTER FUNCTION public.trg_check_parcela_delete() SET search_path = public;
ALTER FUNCTION public.handle_new_user_preferences() SET search_path = public;
ALTER FUNCTION public.fn_update_user_preferences_timestamp() SET search_path = public;
ALTER FUNCTION public.trg_check_venda_finalizada() SET search_path = public;
ALTER FUNCTION public.trg_check_parcela_paga() SET search_path = public;
ALTER FUNCTION public.trg_check_venda_delete() SET search_path = public;
ALTER FUNCTION public.fn_check_cliente_delete_safety() SET search_path = public;
ALTER FUNCTION public.fn_get_merge_preview(uuid) SET search_path = public;
ALTER FUNCTION public.fn_merge_clientes(uuid, uuid, uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.fn_award_referral_points() SET search_path = public;
ALTER FUNCTION public.fn_update_total_indicacoes() SET search_path = public;
