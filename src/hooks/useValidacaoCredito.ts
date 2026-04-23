import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes } from "./useConfiguracoes";
import { differenceInDays, parseISO } from "date-fns";

export interface CreditValidationResult {
  isBlocked: boolean;
  reasons: string[];
  limitExceeded: boolean;
  hasOverdue: boolean;
  availableLimit: number;
  maxDelayDays: number;
  configVerificacaoAtiva: boolean;
}

export function useValidacaoCredito(clienteId: string | null, saleTotal: number = 0) {
  const { data: config } = useConfiguracoes();

  return useQuery({
    queryKey: ["validacao-credito", clienteId, saleTotal],
    enabled: !!clienteId && !!config,
    queryFn: async (): Promise<CreditValidationResult> => {
      if (!clienteId || !config) {
        return {
          isBlocked: false,
          reasons: [],
          limitExceeded: false,
          hasOverdue: false,
          availableLimit: 0,
          maxDelayDays: 0,
          configVerificacaoAtiva: false,
        };
      }

      const verificacaoAtiva = config.verificar_limite_credito ?? true;
      const carenciaGlobal = config.carencia_dias_atraso ?? 15;

      // 1. Fetch Client Data
      const { data: cliente, error: clientErr } = await supabase
        .from("clientes")
        .select("id, nome, permitir_fiado, limite_credito_total, limite_utilizado, permitir_atraso")
        .eq("id", clienteId)
        .single();

      if (clientErr) throw clientErr;

      // 2. Fetch Unpaid Installments
      const { data: parcelas, error: parcelasErr } = await supabase
        .from("parcelas")
        .select("id, vencimento, valor_total, valor_pago")
        .eq("cliente_id", clienteId)
        .in("status", ["pendente", "parcial", "vencida"]);

      if (parcelasErr) throw parcelasErr;

      const reasons: string[] = [];
      let limitExceeded = false;
      let hasOverdue = false;
      let maxDelayDays = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check Overdue (considering grace period)
      if (parcelas && parcelas.length > 0) {
        for (const p of parcelas) {
          const venc = parseISO(p.vencimento);
          const delay = differenceInDays(today, venc);
          if (delay > maxDelayDays) maxDelayDays = delay;

          if (delay > carenciaGlobal) {
            hasOverdue = true;
          }
        }
      }

      // Available limit check
      const limiteTotal = cliente.limite_credito_total ?? config.limite_padrao_credito ?? 1000;
      const limiteUtilizado = cliente.limite_utilizado ?? 0;
      const saldoDisponivel = Math.max(0, limiteTotal - limiteUtilizado);

      if (saleTotal > saldoDisponivel) {
        limitExceeded = true;
      }

      // Determine Blocking
      if (verificacaoAtiva) {
        if (cliente.permitir_fiado === false) {
          reasons.push("Cliente restrito para compras fiado.");
        }
        
        if (hasOverdue && !cliente.permitir_atraso) {
          reasons.push(`Possui parcelas vencidas há mais de ${carenciaGlobal} dias.`);
        }

        if (limitExceeded) {
          reasons.push(`Limite de crédito excedido (Disponível: R$ ${saldoDisponivel.toFixed(2)}).`);
        }
      }

      return {
        isBlocked: reasons.length > 0,
        reasons,
        limitExceeded,
        hasOverdue,
        availableLimit: saldoDisponivel,
        maxDelayDays,
        configVerificacaoAtiva: verificacaoAtiva,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}
