
REVOKE EXECUTE ON FUNCTION public.check_vendas_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_parcelas_pagamentos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_parcelas_vencidas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_saldo_negativo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_itens_orfaos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_resumo_financeiro() FROM PUBLIC, anon, authenticated;
