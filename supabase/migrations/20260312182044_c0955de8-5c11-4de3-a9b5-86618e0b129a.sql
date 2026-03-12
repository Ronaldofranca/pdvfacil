-- RPC: Vendas com total diferente da soma dos itens
CREATE OR REPLACE FUNCTION public.check_vendas_total()
RETURNS TABLE(id uuid, empresa_id uuid, total numeric, soma_itens numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.id, v.empresa_id, v.total,
    COALESCE((SELECT SUM(iv.subtotal) FROM itens_venda iv WHERE iv.venda_id = v.id), 0) as soma_itens
  FROM vendas v
  WHERE v.status = 'finalizada'
    AND ABS(v.total - COALESCE((SELECT SUM(iv.subtotal) FROM itens_venda iv WHERE iv.venda_id = v.id), 0)) > 0.01
  LIMIT 50;
$$;

-- RPC: Parcelas com valor_pago divergente
CREATE OR REPLACE FUNCTION public.check_parcelas_pagamentos()
RETURNS TABLE(id uuid, empresa_id uuid, numero int, valor_pago numeric, soma_pagamentos numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.empresa_id, p.numero, p.valor_pago,
    COALESCE((SELECT SUM(pg.valor_pago) FROM pagamentos pg WHERE pg.parcela_id = p.id), 0) as soma_pagamentos
  FROM parcelas p
  WHERE ABS(p.valor_pago - COALESCE((SELECT SUM(pg.valor_pago) FROM pagamentos pg WHERE pg.parcela_id = p.id), 0)) > 0.01
  LIMIT 50;
$$;

-- RPC: Parcelas vencidas com status pendente
CREATE OR REPLACE FUNCTION public.check_parcelas_vencidas()
RETURNS TABLE(id uuid, empresa_id uuid, numero int, vencimento date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.empresa_id, p.numero, p.vencimento
  FROM parcelas p
  WHERE p.vencimento < CURRENT_DATE AND p.status = 'pendente' AND p.valor_pago < p.valor_total
  ORDER BY p.vencimento
  LIMIT 100;
$$;

-- RPC: Parcelas com saldo negativo
CREATE OR REPLACE FUNCTION public.check_saldo_negativo()
RETURNS TABLE(id uuid, empresa_id uuid, numero int, saldo numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.empresa_id, p.numero, p.saldo
  FROM parcelas p WHERE p.saldo < 0 LIMIT 50;
$$;

-- RPC: Itens órfãos
CREATE OR REPLACE FUNCTION public.check_itens_orfaos()
RETURNS TABLE(qtd bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*) as qtd FROM itens_venda iv
  WHERE NOT EXISTS (SELECT 1 FROM vendas v WHERE v.id = iv.venda_id);
$$;

-- RPC: Resumo financeiro
CREATE OR REPLACE FUNCTION public.check_resumo_financeiro()
RETURNS TABLE(total_vendas numeric, total_parcelas_valor numeric, total_recebido numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COALESCE(SUM(total), 0) FROM vendas WHERE status = 'finalizada') as total_vendas,
    (SELECT COALESCE(SUM(valor_total), 0) FROM parcelas) as total_parcelas_valor,
    (SELECT COALESCE(SUM(valor_pago), 0) FROM pagamentos) as total_recebido;
$$;