
-- Use DROP IF EXISTS + CREATE to be idempotent
DROP TRIGGER IF EXISTS trg_promote_admin_nutary ON public.profiles;
DROP TRIGGER IF EXISTS trg_atualizar_estoque ON public.movimentos_estoque;
DROP TRIGGER IF EXISTS trg_parcela_status ON public.parcelas;
DROP TRIGGER IF EXISTS trg_atualizar_parcela_pagamento ON public.pagamentos;
DROP TRIGGER IF EXISTS trg_audit_vendas ON public.vendas;
DROP TRIGGER IF EXISTS trg_audit_clientes ON public.clientes;
DROP TRIGGER IF EXISTS trg_audit_produtos ON public.produtos;
DROP TRIGGER IF EXISTS trg_audit_parcelas ON public.parcelas;
DROP TRIGGER IF EXISTS trg_audit_estoque ON public.estoque;
DROP TRIGGER IF EXISTS trg_audit_romaneios ON public.romaneios;
DROP TRIGGER IF EXISTS trg_compute_saldo ON public.parcelas;

-- Recreate all triggers
CREATE TRIGGER trg_promote_admin_nutary
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_promote_admin_nutary();

CREATE TRIGGER trg_atualizar_estoque
  AFTER INSERT ON public.movimentos_estoque
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_estoque();

CREATE TRIGGER trg_parcela_status
  BEFORE INSERT OR UPDATE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.fn_parcela_status();

CREATE TRIGGER trg_atualizar_parcela_pagamento
  AFTER INSERT ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_parcela_pagamento();

CREATE TRIGGER trg_audit_vendas
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_clientes
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_produtos
  AFTER INSERT OR UPDATE OR DELETE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_parcelas
  AFTER INSERT OR UPDATE OR DELETE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_estoque
  AFTER INSERT OR UPDATE OR DELETE ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_romaneios
  AFTER INSERT OR UPDATE OR DELETE ON public.romaneios
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE OR REPLACE FUNCTION public.fn_compute_saldo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$ BEGIN NEW.saldo := NEW.valor_total - NEW.valor_pago; RETURN NEW; END; $$;

CREATE TRIGGER trg_compute_saldo
  BEFORE INSERT OR UPDATE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.fn_compute_saldo();

-- Enable realtime for notificacoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
