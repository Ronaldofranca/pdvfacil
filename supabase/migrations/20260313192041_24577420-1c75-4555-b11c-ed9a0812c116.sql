
-- =============================================
-- SECURITY AUDIT FIX 1: Restrict produto_imagens anon policy
-- =============================================
DROP POLICY IF EXISTS "ProdutoImagens: public read" ON public.produto_imagens;

CREATE POLICY "ProdutoImagens: public read scoped"
  ON public.produto_imagens
  FOR SELECT
  TO anon
  USING (empresa_id = public.get_public_empresa_id());

-- =============================================
-- SECURITY AUDIT FIX 2: Fix get_public_empresa_id determinism
-- =============================================
CREATE OR REPLACE FUNCTION public.get_public_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.catalogo_config ORDER BY created_at ASC LIMIT 1
$$;

-- =============================================
-- SECURITY AUDIT FIX 3: Scope verificar-consistencia RPCs by empresa_id
-- =============================================

-- Recreate check_vendas_total with empresa_id filter
CREATE OR REPLACE FUNCTION public.check_vendas_total(_empresa_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, empresa_id uuid, total numeric, soma_itens numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.empresa_id, v.total,
    COALESCE((SELECT SUM(iv.subtotal) FROM itens_venda iv WHERE iv.venda_id = v.id), 0) as soma_itens
  FROM vendas v
  WHERE v.status = 'finalizada'
    AND (_empresa_id IS NULL OR v.empresa_id = _empresa_id)
    AND ABS(v.total - COALESCE((SELECT SUM(iv.subtotal) FROM itens_venda iv WHERE iv.venda_id = v.id), 0)) > 0.01
  LIMIT 50;
$$;

-- Recreate check_parcelas_pagamentos with empresa_id filter
CREATE OR REPLACE FUNCTION public.check_parcelas_pagamentos(_empresa_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, empresa_id uuid, numero integer, valor_pago numeric, soma_pagamentos numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.empresa_id, p.numero, p.valor_pago,
    COALESCE((SELECT SUM(pg.valor_pago) FROM pagamentos pg WHERE pg.parcela_id = p.id), 0) as soma_pagamentos
  FROM parcelas p
  WHERE (_empresa_id IS NULL OR p.empresa_id = _empresa_id)
    AND ABS(p.valor_pago - COALESCE((SELECT SUM(pg.valor_pago) FROM pagamentos pg WHERE pg.parcela_id = p.id), 0)) > 0.01
  LIMIT 50;
$$;

-- Recreate check_parcelas_vencidas with empresa_id filter
CREATE OR REPLACE FUNCTION public.check_parcelas_vencidas(_empresa_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, empresa_id uuid, numero integer, vencimento date)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.empresa_id, p.numero, p.vencimento
  FROM parcelas p
  WHERE p.vencimento < CURRENT_DATE AND p.status = 'pendente' AND p.valor_pago < p.valor_total
    AND (_empresa_id IS NULL OR p.empresa_id = _empresa_id)
  ORDER BY p.vencimento
  LIMIT 100;
$$;

-- Recreate check_saldo_negativo with empresa_id filter
CREATE OR REPLACE FUNCTION public.check_saldo_negativo(_empresa_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, empresa_id uuid, numero integer, saldo numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.empresa_id, p.numero, p.saldo
  FROM parcelas p
  WHERE p.saldo < 0
    AND (_empresa_id IS NULL OR p.empresa_id = _empresa_id)
  LIMIT 50;
$$;

-- Recreate check_itens_orfaos with empresa_id filter
CREATE OR REPLACE FUNCTION public.check_itens_orfaos(_empresa_id uuid DEFAULT NULL)
RETURNS TABLE(qtd bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) as qtd FROM itens_venda iv
  WHERE NOT EXISTS (SELECT 1 FROM vendas v WHERE v.id = iv.venda_id)
    AND (_empresa_id IS NULL OR EXISTS (
      SELECT 1 FROM vendas v2 WHERE v2.id = iv.venda_id AND v2.empresa_id = _empresa_id
    ));
$$;

-- Recreate check_resumo_financeiro with empresa_id filter
CREATE OR REPLACE FUNCTION public.check_resumo_financeiro(_empresa_id uuid DEFAULT NULL)
RETURNS TABLE(total_vendas numeric, total_parcelas_valor numeric, total_recebido numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COALESCE(SUM(total), 0) FROM vendas WHERE status = 'finalizada' AND (_empresa_id IS NULL OR empresa_id = _empresa_id)) as total_vendas,
    (SELECT COALESCE(SUM(valor_total), 0) FROM parcelas WHERE (_empresa_id IS NULL OR empresa_id = _empresa_id)) as total_parcelas_valor,
    (SELECT COALESCE(SUM(valor_pago), 0) FROM pagamentos WHERE (_empresa_id IS NULL OR empresa_id = _empresa_id)) as total_recebido;
$$;
