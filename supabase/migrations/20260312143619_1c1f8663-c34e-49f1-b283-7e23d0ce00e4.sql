
-- Drop existing triggers if any, then recreate
DROP TRIGGER IF EXISTS trg_audit_vendas ON public.vendas;
DROP TRIGGER IF EXISTS trg_audit_clientes ON public.clientes;
DROP TRIGGER IF EXISTS trg_audit_produtos ON public.produtos;
DROP TRIGGER IF EXISTS trg_audit_parcelas ON public.parcelas;
DROP TRIGGER IF EXISTS trg_audit_pagamentos ON public.pagamentos;
DROP TRIGGER IF EXISTS trg_audit_movimentos_estoque ON public.movimentos_estoque;
DROP TRIGGER IF EXISTS trg_audit_configuracoes ON public.configuracoes;
DROP TRIGGER IF EXISTS trg_audit_estoque ON public.estoque;
DROP TRIGGER IF EXISTS trg_audit_romaneios ON public.romaneios;

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

CREATE TRIGGER trg_audit_pagamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_movimentos_estoque
  AFTER INSERT OR UPDATE OR DELETE ON public.movimentos_estoque
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_configuracoes
  AFTER INSERT OR UPDATE OR DELETE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_estoque
  AFTER INSERT OR UPDATE OR DELETE ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_audit_romaneios
  AFTER INSERT OR UPDATE OR DELETE ON public.romaneios
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_created ON public.audit_logs (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela ON public.audit_logs (tabela);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON public.audit_logs (usuario_id);
