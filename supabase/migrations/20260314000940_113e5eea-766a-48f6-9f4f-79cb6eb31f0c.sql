
-- Add restrictive RLS policy to scope cliente_telefones for clients
CREATE POLICY "cliente_telefones_client_scope"
  ON public.cliente_telefones
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    NOT public.is_cliente()
    OR cliente_id = public.get_my_cliente_id()
  );
