
-- Restrict clients from seeing configuracoes (except via controlled queries)
-- They currently can SELECT all config fields including internal business settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'configuracoes_client_block' AND tablename = 'configuracoes') THEN
    CREATE POLICY "configuracoes_client_block"
      ON public.configuracoes
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Restrict clients from seeing profiles of other users (they can currently see all profiles in empresa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_client_scope' AND tablename = 'profiles') THEN
    CREATE POLICY "profiles_client_scope"
      ON public.profiles
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        NOT public.is_cliente()
        OR user_id = auth.uid()
        OR user_id = (SELECT vendedor_id FROM public.clientes WHERE user_id = auth.uid() LIMIT 1)
      );
  END IF;
END $$;

-- Block clients from modifying profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_client_no_update' AND tablename = 'profiles') THEN
    CREATE POLICY "profiles_client_no_update"
      ON public.profiles
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from enderecos of other clients
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enderecos_client_scope' AND tablename = 'enderecos') THEN
    CREATE POLICY "enderecos_client_scope"
      ON public.enderecos
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
  END IF;
END $$;

-- Block clients from modifying enderecos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enderecos_client_no_insert' AND tablename = 'enderecos') THEN
    CREATE POLICY "enderecos_client_no_insert"
      ON public.enderecos
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enderecos_client_no_update' AND tablename = 'enderecos') THEN
    CREATE POLICY "enderecos_client_no_update"
      ON public.enderecos
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enderecos_client_no_delete' AND tablename = 'enderecos') THEN
    CREATE POLICY "enderecos_client_no_delete"
      ON public.enderecos
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from indicacoes_clientes (internal data)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'indicacoes_client_block' AND tablename = 'indicacoes_clientes') THEN
    CREATE POLICY "indicacoes_client_block"
      ON public.indicacoes_clientes
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from kits (internal product config)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'kits_client_block' AND tablename = 'kits') THEN
    CREATE POLICY "kits_client_block"
      ON public.kits
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from kit_itens
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'kit_itens_client_block' AND tablename = 'kit_itens') THEN
    CREATE POLICY "kit_itens_client_block"
      ON public.kit_itens
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from formas_pagamento (internal config)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'formas_pagamento_client_block' AND tablename = 'formas_pagamento') THEN
    CREATE POLICY "formas_pagamento_client_block"
      ON public.formas_pagamento
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from devices table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'devices_client_block' AND tablename = 'devices') THEN
    CREATE POLICY "devices_client_block"
      ON public.devices
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from notificacoes (internal system notifications)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notificacoes_client_block' AND tablename = 'notificacoes') THEN
    CREATE POLICY "notificacoes_client_block"
      ON public.notificacoes
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Restrict pedidos: client can only see own pedidos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pedidos_client_scope' AND tablename = 'pedidos') THEN
    CREATE POLICY "pedidos_client_scope"
      ON public.pedidos
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
  END IF;
END $$;

-- Restrict pedidos: client can only insert own pedidos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pedidos_client_insert_scope' AND tablename = 'pedidos') THEN
    CREATE POLICY "pedidos_client_insert_scope"
      ON public.pedidos
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
  END IF;
END $$;

-- Block clients from updating/deleting pedidos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pedidos_client_no_update' AND tablename = 'pedidos') THEN
    CREATE POLICY "pedidos_client_no_update"
      ON public.pedidos
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pedidos_client_no_delete' AND tablename = 'pedidos') THEN
    CREATE POLICY "pedidos_client_no_delete"
      ON public.pedidos
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Restrict parcelas: client can only see own parcelas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'parcelas_client_scope' AND tablename = 'parcelas') THEN
    CREATE POLICY "parcelas_client_scope"
      ON public.parcelas
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
  END IF;
END $$;

-- Restrict vendas: client can only see own vendas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vendas_client_scope' AND tablename = 'vendas') THEN
    CREATE POLICY "vendas_client_scope"
      ON public.vendas
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente() OR cliente_id = public.get_my_cliente_id());
  END IF;
END $$;

-- Block clients from historico_compras mutations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'historico_client_no_insert' AND tablename = 'historico_compras') THEN
    CREATE POLICY "historico_client_no_insert"
      ON public.historico_compras
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'historico_client_no_update' AND tablename = 'historico_compras') THEN
    CREATE POLICY "historico_client_no_update"
      ON public.historico_compras
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'historico_client_no_delete' AND tablename = 'historico_compras') THEN
    CREATE POLICY "historico_client_no_delete"
      ON public.historico_compras
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from seeing produtos custo field (restrict to only active products)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'produtos_client_active_only' AND tablename = 'produtos') THEN
    CREATE POLICY "produtos_client_active_only"
      ON public.produtos
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente() OR ativo = true);
  END IF;
END $$;

-- Block clients from mutating produtos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'produtos_client_no_insert' AND tablename = 'produtos') THEN
    CREATE POLICY "produtos_client_no_insert"
      ON public.produtos
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'produtos_client_no_update' AND tablename = 'produtos') THEN
    CREATE POLICY "produtos_client_no_update"
      ON public.produtos
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from security_logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'security_logs_client_block' AND tablename = 'security_logs') THEN
    CREATE POLICY "security_logs_client_block"
      ON public.security_logs
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block client from catalogo_config (internal styling/config)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'catalogo_config_client_block' AND tablename = 'catalogo_config') THEN
    CREATE POLICY "catalogo_config_client_block"
      ON public.catalogo_config
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Block clients from user_roles mutations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_client_no_insert' AND tablename = 'user_roles') THEN
    CREATE POLICY "user_roles_client_no_insert"
      ON public.user_roles
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_client_no_update' AND tablename = 'user_roles') THEN
    CREATE POLICY "user_roles_client_no_update"
      ON public.user_roles
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_client_no_delete' AND tablename = 'user_roles') THEN
    CREATE POLICY "user_roles_client_no_delete"
      ON public.user_roles
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (NOT public.is_cliente());
  END IF;
END $$;

-- Scope user_roles SELECT for clients to only see their own role
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_client_scope' AND tablename = 'user_roles') THEN
    CREATE POLICY "user_roles_client_scope"
      ON public.user_roles
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (NOT public.is_cliente() OR user_id = auth.uid());
  END IF;
END $$;
