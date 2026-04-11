-- =============================================================================
-- MIGRATION: Índices de Performance para Consultas Críticas
-- Objetivo: Acelerar listagens, filtros por status, datas e agregações
-- =============================================================================

-- ── VENDAS ─────────────────────────────────────────────────────────────────
-- Acelera filtros por empresa + data (Dashboard, Relatórios)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendas_empresa_data_venda
  ON public.vendas (empresa_id, data_venda DESC);

-- Acelera filtros por status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendas_empresa_status
  ON public.vendas (empresa_id, status);

-- Acelera a checagem de idempotency key
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendas_idempotency_key
  ON public.vendas (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── ITENS_VENDA ────────────────────────────────────────────────────────────
-- Acelera lookups de itens por venda
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_itens_venda_venda_id
  ON public.itens_venda (venda_id);

-- ── PARCELAS ───────────────────────────────────────────────────────────────
-- Acelera listagem de parcelas por empresa + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcelas_empresa_status
  ON public.parcelas (empresa_id, status);

-- Acelera filtros por vencimento (relatórios de inadimplência)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcelas_empresa_vencimento
  ON public.parcelas (empresa_id, vencimento);

-- Índice parcial: apenas registros pendentes (a maioria das queries da tela de financeiro)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcelas_pendentes
  ON public.parcelas (empresa_id, vencimento)
  WHERE status IN ('pendente', 'parcial', 'vencida');

-- Acelera lookups por cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcelas_cliente_id
  ON public.parcelas (cliente_id)
  WHERE cliente_id IS NOT NULL;

-- ── PEDIDOS ────────────────────────────────────────────────────────────────
-- Acelera filtros por empresa + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_empresa_status
  ON public.pedidos (empresa_id, status);

-- Acelera ordenação por data de entrega
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_empresa_entrega
  ON public.pedidos (empresa_id, data_prevista_entrega);

-- ── SYNC_LOGS ──────────────────────────────────────────────────────────────
-- Evita scans lentos para checar logs de erro
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_empresa_status
  ON public.sync_logs (empresa_id, status, created_at DESC);

-- ── MOVIMENTOS_ESTOQUE ────────────────────────────────────────────────────
-- Acelera relatórios de movimentação de estoque
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimentos_estoque_empresa_produto
  ON public.movimentos_estoque (empresa_id, produto_id, data DESC);

-- ── PAGAMENTOS ────────────────────────────────────────────────────────────
-- Acelera join com parcelas para exibição de data de pagamento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagamentos_parcela_id
  ON public.pagamentos (parcela_id);

-- ── CLIENTES ──────────────────────────────────────────────────────────────
-- Acelera busca full-text por nome
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientes_empresa_ativo
  ON public.clientes (empresa_id, ativo);
