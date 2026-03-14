
-- Performance indices for portal queries
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON public.pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_id ON public.pedidos (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cliente_id ON public.parcelas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.vendas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes (user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes (cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON public.clientes (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_historico_compras_cliente_id ON public.historico_compras (cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON public.itens_pedido (pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda (venda_id);
CREATE INDEX IF NOT EXISTS idx_cliente_telefones_cliente_id ON public.cliente_telefones (cliente_id);

-- Restrictive policies: block clients from INSERT/UPDATE/DELETE on cliente_telefones
CREATE POLICY "cliente_telefones_client_no_insert"
  ON public.cliente_telefones
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT public.is_cliente());

CREATE POLICY "cliente_telefones_client_no_update"
  ON public.cliente_telefones
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (NOT public.is_cliente());

CREATE POLICY "cliente_telefones_client_no_delete"
  ON public.cliente_telefones
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (NOT public.is_cliente());

-- Restrictive policy: block clients from INSERT on vendas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vendas_client_no_insert' AND tablename = 'vendas') THEN
    CREATE POLICY "vendas_client_no_insert"
      ON public.vendas
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (NOT public.is_cliente());
  END IF;
END $$;

-- Restrictive policy: block clients from UPDATE/DELETE on vendas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vendas_client_no_update' AND tablename = 'vendas') THEN
    CREATE POLICY "vendas_client_no_update"
      ON public.vendas
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vendas_client_no_delete' AND tablename = 'vendas') THEN
    CREATE POLICY "vendas_client_no_delete"
      ON public.vendas
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Restrictive policy: block clients from UPDATE/DELETE on parcelas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'parcelas_client_no_update' AND tablename = 'parcelas') THEN
    CREATE POLICY "parcelas_client_no_update"
      ON public.parcelas
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'parcelas_client_no_delete' AND tablename = 'parcelas') THEN
    CREATE POLICY "parcelas_client_no_delete"
      ON public.parcelas
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'parcelas_client_no_insert' AND tablename = 'parcelas') THEN
    CREATE POLICY "parcelas_client_no_insert"
      ON public.parcelas
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from pagamentos entirely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pagamentos_client_block' AND tablename = 'pagamentos') THEN
    CREATE POLICY "pagamentos_client_block"
      ON public.pagamentos
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;
