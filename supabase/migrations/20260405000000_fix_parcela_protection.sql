
-- ====================================================================
-- CORREÇÃO: PROTEÇÃO DE PARCELAS E ATUALIZAÇÃO DE PAGAMENTOS
-- ====================================================================

-- 1. Otimizar a função de atualização de parcela para evitar UPDATEs desnecessários.
-- Isso previne o disparo do gatilho de imutabilidade quando o valor não mudou.
CREATE OR REPLACE FUNCTION public.fn_atualizar_parcela_pagamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _novo_valor_pago NUMERIC(12,2);
BEGIN
  -- Calcula o novo total pago baseado na soma de todos os pagamentos daquela parcela
  SELECT COALESCE(SUM(p.valor_pago), 0)
  INTO _novo_valor_pago
  FROM public.pagamentos p
  WHERE p.parcela_id = NEW.parcela_id;

  -- Só executa o UPDATE se o valor_pago for diferente do atual
  -- Isso evita falhas em atualizações redundantes de parcelas já pagas
  UPDATE public.parcelas
  SET valor_pago = _novo_valor_pago
  WHERE id = NEW.parcela_id 
    AND (valor_pago IS DISTINCT FROM _novo_valor_pago);

  RETURN NEW;
END;
$$;

-- 2. Relaxar o gatilho de imutabilidade para permitir atualizações redundantes ou re-sincronizações.
-- O objetivo é impedir MUDANÇAS de valor em parcelas pagas, mas não impedir 
-- que o sistema confirme que ela continua paga.
CREATE OR REPLACE FUNCTION public.trg_check_parcela_paga()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloqueia se a parcela JÁ ESTAVA paga E:
  -- a) O status está sendo alterado para algo diferente de 'paga'
  -- b) O valor pago está sendo alterado (diminuído ou aumentado ilegalmente)
  -- c) O valor total está sendo alterado
  IF OLD.status = 'paga' THEN
    IF (NEW.status IS DISTINCT FROM 'paga') OR 
       (NEW.valor_pago IS DISTINCT FROM OLD.valor_pago) OR
       (NEW.valor_total IS DISTINCT FROM OLD.valor_total) 
    THEN
      RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Parcelas pagas são imutáveis. O histórico contábil não pode ser reescrito. Para correções, exclua o pagamento associado (se permitido) ou entre em contato com o suporte.';
    END IF;
  END IF;

  -- Mantém a proteção estrita para canceladas
  IF OLD.status = 'cancelada' AND (NEW.status IS DISTINCT FROM 'cancelada' OR NEW.valor_pago IS DISTINCT FROM OLD.valor_pago) THEN
    RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Parcelas canceladas são permanentes e não podem ser modificadas.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-vincular o gatilho (DROP + CREATE para garantir que a versão nova seja aplicada)
DROP TRIGGER IF EXISTS trg_parcelas_imutabilidade ON public.parcelas;
CREATE TRIGGER trg_parcelas_imutabilidade
BEFORE UPDATE ON public.parcelas
FOR EACH ROW EXECUTE FUNCTION public.trg_check_parcela_paga();

COMMENT ON FUNCTION public.trg_check_parcela_paga IS 'Garante que dados financeiros de parcelas pagas não sejam corrompidos, permitindo apenas atualizações de metadados ou redundantes.';
