
-- Performance indexes for common query patterns

-- Vendas: filter by date + status (dashboard, reports)
CREATE INDEX IF NOT EXISTS idx_vendas_data_status ON public.vendas (data_venda, status);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_data ON public.vendas (empresa_id, data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON public.vendas (vendedor_id, data_venda DESC);

-- Parcelas: filter by status, vencimento (dashboard, financeiro)
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON public.parcelas (status, vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_empresa_status ON public.parcelas (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_parcelas_venda ON public.parcelas (venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cliente ON public.parcelas (cliente_id, status);

-- Pagamentos: filter by date (recebimentos)
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON public.pagamentos (data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_parcela ON public.pagamentos (parcela_id);

-- Itens venda: join by venda_id
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON public.itens_venda (venda_id);

-- Estoque: lookup by produto
CREATE INDEX IF NOT EXISTS idx_estoque_produto ON public.estoque (produto_id, empresa_id);

-- Movimentos estoque: date range queries
CREATE INDEX IF NOT EXISTS idx_movimentos_data ON public.movimentos_estoque (data DESC, empresa_id);

-- Produtos: active products lookup
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos (empresa_id, ativo);

-- Clientes: active clients search
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_ativo ON public.clientes (empresa_id, ativo);

-- Audit logs: time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (empresa_id, created_at DESC);
