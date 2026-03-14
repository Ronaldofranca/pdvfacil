
-- Add total_cost and total_profit columns (may already exist from partial migration)
ALTER TABLE public.vendas 
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit numeric NOT NULL DEFAULT 0;

-- Temporarily disable user triggers for backfill
ALTER TABLE public.vendas DISABLE TRIGGER trg_protect_venda_finalizada;
ALTER TABLE public.vendas DISABLE TRIGGER trg_audit_vendas;
ALTER TABLE public.vendas DISABLE TRIGGER trg_award_referral_points;
ALTER TABLE public.vendas DISABLE TRIGGER trg_ledger_venda;

-- Backfill from itens_venda snapshots
UPDATE public.vendas v
SET 
  total_cost = COALESCE(calc.sum_cost, 0),
  total_profit = COALESCE(calc.sum_profit, 0)
FROM (
  SELECT 
    iv.venda_id,
    SUM(COALESCE(iv.custo_unitario, 0) * iv.quantidade) AS sum_cost,
    SUM(iv.subtotal - COALESCE(iv.custo_unitario, 0) * iv.quantidade) AS sum_profit
  FROM public.itens_venda iv
  GROUP BY iv.venda_id
) calc
WHERE v.id = calc.venda_id;

-- Re-enable triggers
ALTER TABLE public.vendas ENABLE TRIGGER trg_protect_venda_finalizada;
ALTER TABLE public.vendas ENABLE TRIGGER trg_audit_vendas;
ALTER TABLE public.vendas ENABLE TRIGGER trg_award_referral_points;
ALTER TABLE public.vendas ENABLE TRIGGER trg_ledger_venda;
