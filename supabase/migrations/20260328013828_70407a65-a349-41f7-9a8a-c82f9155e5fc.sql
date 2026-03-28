
-- Block cliente role from reading pedidos_reposicao
CREATE POLICY "block_clientes_pedidos_reposicao"
ON public.pedidos_reposicao
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (NOT public.is_cliente());

-- Block cliente role from reading itens_pedido_reposicao
CREATE POLICY "block_clientes_itens_pedido_reposicao"
ON public.itens_pedido_reposicao
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (NOT public.is_cliente());
