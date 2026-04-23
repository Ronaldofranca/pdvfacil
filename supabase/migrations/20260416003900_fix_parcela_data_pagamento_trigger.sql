
-- Fix: sincroniza parcelas.data_pagamento com a data real do pagamento e
-- corrige fn_corrigir_pagamento para também atualizar parcelas.data_pagamento.
--
-- PROBLEMA: o trigger fn_parcela_status usava now() ao invés da data_pagamento
-- real quando registrava pagamentos parciais, causando desalinhamento nos relatórios.

-- 1. Sincronização retroativa: corrige todos os registros existentes
UPDATE public.parcelas p
SET data_pagamento = pg_latest.data_pagamento
FROM (
  SELECT DISTINCT ON (parcela_id)
    parcela_id,
    data_pagamento
  FROM public.pagamentos
  ORDER BY parcela_id, created_at DESC
) pg_latest
WHERE pg_latest.parcela_id = p.id
  AND p.data_pagamento::date != pg_latest.data_pagamento::date;

-- 2. Atualiza fn_corrigir_pagamento para também sincronizar parcelas.data_pagamento
CREATE OR REPLACE FUNCTION public.fn_corrigir_pagamento(
  _pagamento_id UUID,
  _novo_valor NUMERIC,
  _nova_data_pagamento TIMESTAMPTZ DEFAULT NULL,
  _motivo TEXT DEFAULT '',
  _usuario_id UUID DEFAULT NULL,
  _usuario_nome TEXT DEFAULT 'Sistema'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pagamento RECORD;
  _obs_nova TEXT;
BEGIN
  SELECT * INTO _pagamento FROM public.pagamentos WHERE id = _pagamento_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento não encontrado');
  END IF;

  _obs_nova := '== CORREÇÃO == por ' || _usuario_nome || ' | Valor: '
    || _pagamento.valor_pago || ' → ' || _novo_valor
    || CASE WHEN _nova_data_pagamento IS NOT NULL AND _nova_data_pagamento != _pagamento.data_pagamento
            THEN ' | Data: ' || _pagamento.data_pagamento::date::text || ' → ' || _nova_data_pagamento::date::text
            ELSE '' END
    || ' | Motivo: ' || _motivo
    || CASE WHEN _pagamento.observacoes != '' THEN chr(10) || _pagamento.observacoes ELSE '' END;

  -- Atualiza o registro no pagamentos
  UPDATE public.pagamentos
  SET
    valor_pago = _novo_valor,
    data_pagamento = COALESCE(_nova_data_pagamento, data_pagamento),
    observacoes = _obs_nova
  WHERE id = _pagamento_id;

  -- Também sincroniza parcelas.data_pagamento para manter consistência
  UPDATE public.parcelas
  SET data_pagamento = COALESCE(_nova_data_pagamento, _pagamento.data_pagamento)
  WHERE id = _pagamento.parcela_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
