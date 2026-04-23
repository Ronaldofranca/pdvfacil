-- Migration: Fix Admin/Vendedor Sales Visibility
-- Description: Corrects RLS policies for 'vendas' and related tables. 
-- Fixes the issue where 'vendedor_id' was being compared directly to 'auth.uid()'.
-- Ensures is_admin() and is_gerente() can see all records within their empresa.

-- 1. Correct Vendas Policies (Permissive)
DROP POLICY IF EXISTS "Vendas: select own empresa" ON public.vendas;
CREATE POLICY "Vendas: select own empresa" ON public.vendas 
FOR SELECT TO authenticated 
USING (
  empresa_id = public.get_my_empresa_id() 
  AND (
    public.is_admin() 
    OR public.is_gerente()
    OR vendedor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- 2. Correct Metas Vendedor Policies
DROP POLICY IF EXISTS "Metas: select own or admin/gerente" ON public.metas_vendedor;
CREATE POLICY "Metas: select own or admin/gerente" ON public.metas_vendedor 
FOR SELECT TO authenticated 
USING (
  empresa_id = public.get_my_empresa_id() 
  AND (
    public.is_admin() 
    OR public.is_gerente()
    OR vendedor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- 3. Correct Itens Venda (Consistency)
DROP POLICY IF EXISTS "Itens venda: select via venda" ON public.itens_venda;
CREATE POLICY "Itens venda: select via venda" ON public.itens_venda 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.vendas v 
    WHERE v.id = itens_venda.venda_id 
      AND v.empresa_id = public.get_my_empresa_id()
      AND (
        public.is_admin() 
        OR public.is_gerente()
        OR v.vendedor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
  )
);

-- 4. Correct Parcelas (Consistency)
DROP POLICY IF EXISTS "Parcelas: select own empresa" ON public.parcelas;
CREATE POLICY "Parcelas: select own empresa" ON public.parcelas 
FOR SELECT TO authenticated 
USING (
  empresa_id = public.get_my_empresa_id() 
  AND (
    public.is_admin() 
    OR public.is_gerente()
    OR EXISTS (
         SELECT 1 FROM public.vendas v 
         WHERE v.id = parcelas.venda_id 
         AND v.vendedor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
       )
  )
);

-- 5. Correct Notificações
DROP POLICY IF EXISTS "Notificacoes: select own" ON public.notificacoes;
CREATE POLICY "Notificacoes: select own" ON public.notificacoes
FOR SELECT TO authenticated
USING (
  empresa_id = public.get_my_empresa_id() 
  AND (
    public.is_admin() 
    OR public.is_gerente()
    OR usuario_id = auth.uid()
  )
);

-- 6. Ensure security definer functions are safe
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_gerente() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_empresa_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public, pg_temp;
