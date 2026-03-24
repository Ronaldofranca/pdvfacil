-- ==========================================
-- PROTEÇÃO DE DADOS: IMUTABILIDADE DE VENDAS
-- ==========================================

-- 1. Trigger para UPDATE em vendas
CREATE OR REPLACE FUNCTION public.trg_check_venda_finalizada()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'finalizada' THEN
    -- A única transição válida para uma venda finalizada é ser cancelada.
    IF NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Vendas finalizadas são estritamente imutáveis. Elas só podem sofrer alteração através do fluxo oficial de "cancelamento".';
    END IF;
  END IF;
  
  -- Vendas canceladas também são imutáveis
  IF OLD.status = 'cancelada' THEN
    RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Vendas canceladas são permanentes e não podem ser reabertas ou modificadas sob nenhuma circunstância.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendas_imutabilidade ON public.vendas;
CREATE TRIGGER trg_vendas_imutabilidade
BEFORE UPDATE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.trg_check_venda_finalizada();


-- 2. Trigger para DELETE em vendas
CREATE OR REPLACE FUNCTION public.trg_check_venda_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('finalizada', 'cancelada') THEN
    RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Exclusão (DELETE) bloqueada. Não é permitido excluir o registro de vendas finalizadas ou canceladas.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendas_delete_block ON public.vendas;
CREATE TRIGGER trg_vendas_delete_block
BEFORE DELETE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.trg_check_venda_delete();


-- ============================================
-- PROTEÇÃO DE DADOS: IMUTABILIDADE DE PARCELAS
-- ============================================

-- 3. Trigger para UPDATE em parcelas
CREATE OR REPLACE FUNCTION public.trg_check_parcela_paga()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'paga' THEN
    RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Parcelas pagas são imutáveis. O valor já entrou no caixa e o histórico contábil não pode ser reescrito.';
  END IF;

  IF OLD.status = 'cancelada' THEN
    RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Parcelas canceladas são permanentes e não podem ser modificadas.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parcelas_imutabilidade ON public.parcelas;
CREATE TRIGGER trg_parcelas_imutabilidade
BEFORE UPDATE ON public.parcelas
FOR EACH ROW EXECUTE FUNCTION public.trg_check_parcela_paga();


-- 4. Trigger para DELETE em parcelas
CREATE OR REPLACE FUNCTION public.trg_check_parcela_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('paga', 'cancelada') THEN
    RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Exclusão (DELETE) bloqueada. Não é permitido excluir fisicamente parcelas pagas ou canceladas do banco de dados.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parcelas_delete_block ON public.parcelas;
CREATE TRIGGER trg_parcelas_delete_block
BEFORE DELETE ON public.parcelas
FOR EACH ROW EXECUTE FUNCTION public.trg_check_parcela_delete();
