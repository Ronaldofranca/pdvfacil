
-- 1) Add permitir_fiado to clientes (default true = allowed)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS permitir_fiado boolean NOT NULL DEFAULT true;

-- 2) Add cancellation tracking fields to vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS motivo_cancelamento text DEFAULT '';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cancelado_por uuid;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cancelado_em timestamptz;

-- 3) Block physical DELETE of vendas for all roles
-- Drop any existing DELETE policies on vendas
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'vendas' AND schemaname = 'public' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendas', pol.policyname);
  END LOOP;
END $$;

-- Create a DENY-ALL delete policy (uses false)
CREATE POLICY "vendas_no_delete" ON public.vendas
  FOR DELETE TO authenticated
  USING (false);

-- 4) Block physical DELETE of parcelas (soft-cancel only)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'parcelas' AND schemaname = 'public' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.parcelas', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "parcelas_no_delete" ON public.parcelas
  FOR DELETE TO authenticated
  USING (false);

-- 5) Block physical DELETE of pagamentos
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'pagamentos' AND schemaname = 'public' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pagamentos', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "pagamentos_no_delete" ON public.pagamentos
  FOR DELETE TO authenticated
  USING (false);

-- 6) Block physical DELETE of itens_venda
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'itens_venda' AND schemaname = 'public' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.itens_venda', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "itens_venda_no_delete" ON public.itens_venda
  FOR DELETE TO authenticated
  USING (false);
