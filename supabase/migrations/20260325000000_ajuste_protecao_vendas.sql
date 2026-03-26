-- ========================================================
-- AJUSTE DE PROTEÇÃO DE DADOS: FLEXIBILIDADE PARA FINACEIRO
-- ========================================================

-- Atualizando a trigger de vendas para permitir recebimentos
CREATE OR REPLACE FUNCTION public.trg_check_venda_finalizada()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a venda já estava finalizada
  IF OLD.status = 'finalizada' THEN
    -- 1. Permitir cancelamento (já era permitido)
    IF NEW.status = 'cancelada' THEN
      RETURN NEW;
    END IF;

    -- 2. Bloquear alteração de dados CORE (fiscal/pedido)
    -- Se tentarem mudar o total, cliente ou subtotal, bloqueamos.
    IF (NEW.total IS DISTINCT FROM OLD.total) OR 
       (NEW.subtotal IS DISTINCT FROM OLD.subtotal) OR 
       (NEW.desconto_total IS DISTINCT FROM OLD.desconto_total) OR
       (NEW.cliente_id IS DISTINCT FROM OLD.cliente_id) OR
       (NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: O conteúdo base de uma venda finalizada (valores, cliente, data original) não pode ser alterado. Para correções, cancele esta venda e crie uma nova.';
    END IF;

    -- 3. Se chegou aqui e o status ainda é 'finalizada', permitimos a atualização.
    -- Isso libera os campos 'pagamentos', 'observacoes' e 'updated_at'.
    RETURN NEW;
  END IF;
  
  -- Vendas canceladas continuam estritamente imutáveis
  IF OLD.status = 'cancelada' THEN
    RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Vendas com status "cancelada" são registros permanentes e não podem ser modificadas.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-aplicando a trigger (apenas para garantir)
DROP TRIGGER IF EXISTS trg_vendas_imutabilidade ON public.vendas;
CREATE TRIGGER trg_vendas_imutabilidade
BEFORE UPDATE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.trg_check_venda_finalizada();

-- Nota: As triggers de parcelas não precisam de ajuste pois já permitem transição 
-- de 'pendente' para 'paga' (bloqueiam apenas se o OLD já era 'paga').
