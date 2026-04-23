-- Garante permissive policies para o portal do cliente ver vendas e parcelas
-- As políticas de isolation restritas para empresas/vendedores acabaram bloqueando 
-- a visão do cliente (is_cliente). O "client_scope" é RESTRICTIVE, 
-- então precisamos de ao menos uma permissão PERMISSIVE para clientes.

-- Vendas
DROP POLICY IF EXISTS "Vendas: select for clientes" ON public.vendas;
CREATE POLICY "Vendas: select for clientes" ON public.vendas
  FOR SELECT TO authenticated
  USING (
    public.is_cliente() 
    AND cliente_id = public.get_my_cliente_id()
    AND empresa_id = public.get_my_empresa_id()
  );

-- Parcelas
DROP POLICY IF EXISTS "Parcelas: select for clientes" ON public.parcelas;
CREATE POLICY "Parcelas: select for clientes" ON public.parcelas
  FOR SELECT TO authenticated
  USING (
    public.is_cliente() 
    AND cliente_id = public.get_my_cliente_id()
    AND empresa_id = public.get_my_empresa_id()
  );
