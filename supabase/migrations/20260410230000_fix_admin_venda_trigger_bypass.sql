-- =============================================================================
-- Migration: Permitir Bypass da Imutabilidade para Administradores
-- Atualiza a trigger de proteção de vendas para permitir que modificações
-- administrativas (feitas por is_admin() == true) não sejam bloqueadas.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_check_venda_finalizada()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'finalizada' THEN
    -- A transição natural para uma venda finalizada é ser cancelada.
    IF NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
      RETURN NEW;
    -- Bypass: Se a sessão for de um usuário ADMIN, permitimos a edição administrativa da venda.
    ELSIF public.is_admin() THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Vendas finalizadas são estritamente imutáveis. Elas só podem sofrer alteração através do fluxo oficial de "cancelamento".';
    END IF;
  END IF;
  
  -- Vendas canceladas também são imutáveis, a menos que seja admin tentando corrigir dados estruturais vitais.
  IF OLD.status = 'cancelada' THEN
    IF public.is_admin() THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'POLITICA DE PROTEÇÃO DE DADOS: Vendas canceladas são permanentes e não podem ser reabertas ou modificadas sob nenhuma circunstância.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
