-- =============================================================================
-- DIAGNÓSTICO: Verificar dados das vendas de ontem (04/04/2026)
-- Execute no Supabase SQL Editor para entender o estado atual
-- =============================================================================

-- 1. VERIFICAR VENDAS SEM ITENS (criadas após 02/04/2026)
SELECT 
  v.id,
  substr(v.id::text, 1, 8) as venda_curta,
  v.data_venda,
  v.status,
  v.total,
  c.nome as cliente,
  (SELECT COUNT(*) FROM itens_venda iv WHERE iv.venda_id = v.id) as qtd_itens,
  (SELECT COUNT(*) FROM parcelas p WHERE p.venda_id = v.id) as qtd_parcelas,
  v.pagamentos
FROM vendas v
LEFT JOIN clientes c ON c.id = v.cliente_id
WHERE v.data_venda >= '2026-04-04T00:00:00'
  AND v.status = 'finalizada'
ORDER BY v.data_venda DESC;

-- =============================================================================
-- RECUPERAÇÃO: Gerar parcelas faltantes para vendas do crediário sem parcelas
-- Execute SOMENTE se a consulta acima mostrar vendas com qtd_parcelas = 0
-- e que têm pagamento "crediario" no JSON
-- =============================================================================
/*
-- ATENÇÃO: Substitua os valores de _num_parcelas, _primeiro_vencimento e _entrada
-- conforme informação de cada venda afetada.
-- Você pode ver os dados originais no histórico do app ou com o cliente.

-- Exemplo para gerar 1 parcela simples (venda sem entrada):
INSERT INTO parcelas (empresa_id, venda_id, cliente_id, numero, valor_total, valor_pago, vencimento, forma_pagamento)
SELECT 
  v.empresa_id,
  v.id,
  v.cliente_id,
  1,
  v.total,
  0,
  (v.data_venda::date + interval '30 days')::date,  -- ajuste a data de vencimento
  'crediario'
FROM vendas v
WHERE v.id = 'COLE-O-ID-DA-VENDA-AQUI'
  AND NOT EXISTS (SELECT 1 FROM parcelas p WHERE p.venda_id = v.id);
*/
