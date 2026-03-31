import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateDashboardQueries } from "@/hooks/useVendas";
import { distribuirPagamento, type ParcelaParaDistribuir } from "@/lib/distribuirPagamento";

export function useParcelas(
  filters?: { vendaId?: string; clienteId?: string; status?: string; startDate?: Date; endDate?: Date },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["parcelas", filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      let q = supabase
        .from("parcelas")
        .select("*, clientes(nome), vendas(id)")
        .order("vencimento");
      
      if (filters?.vendaId) q = q.eq("venda_id", filters.vendaId);
      if (filters?.clienteId) q = q.eq("cliente_id", filters.clienteId);
      
      if (filters?.status === "pendente") {
        q = q.in("status", ["pendente", "parcial"] as any[]);
      } else if (filters?.status && filters.status !== "todas") {
        q = q.eq("status", filters.status as any);
      }

      if (filters?.startDate || filters?.endDate) {
        const start = filters?.startDate?.toISOString();
        const end = filters?.endDate?.toISOString();
        
        if (start && end) {
          q = q.or(`vencimento.gte.${start},vencimento.lte.${end},data_pagamento.gte.${start},data_pagamento.lte.${end}`);
        } else if (start) {
          q = q.or(`vencimento.gte.${start},data_pagamento.gte.${start}`);
        } else if (end) {
          q = q.or(`vencimento.lte.${end},data_pagamento.lte.${end}`);
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export interface ParcelaGerarInput {
  empresa_id: string;
  venda_id?: string;
  cliente_id?: string;
  valor_total: number;
  num_parcelas: number;
  primeiro_vencimento: string; // YYYY-MM-DD
  forma_pagamento?: string;
}

export function useGerarParcelas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ParcelaGerarInput) => {
      const valorParcela = Math.floor((input.valor_total / input.num_parcelas) * 100) / 100;
      const resto = Math.round((input.valor_total - valorParcela * input.num_parcelas) * 100) / 100;

      const parcelas = [];
      const baseDate = new Date(input.primeiro_vencimento + "T12:00:00");

      for (let i = 0; i < input.num_parcelas; i++) {
        const venc = new Date(baseDate);
        venc.setMonth(venc.getMonth() + i);
        const valor = i === 0 ? valorParcela + resto : valorParcela;

        parcelas.push({
          empresa_id: input.empresa_id,
          venda_id: input.venda_id || null,
          cliente_id: input.cliente_id || null,
          numero: i + 1,
          valor_total: valor,
          valor_pago: 0,
          vencimento: venc.toISOString().split("T")[0],
          forma_pagamento: input.forma_pagamento ?? "",
        });
      }

      const { error } = await supabase.from("parcelas").insert(parcelas);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDashboardQueries(qc);
      toast.success("Parcelas geradas!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface PagamentoInput {
  empresa_id: string;
  parcela_id: string;
  valor_pago: number;
  forma_pagamento: string;
  usuario_id: string;
  observacoes?: string;
}

export function useRegistrarPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PagamentoInput) => {
      const { data, error } = await supabase
        .from("pagamentos")
        .insert({
          empresa_id: input.empresa_id,
          parcela_id: input.parcela_id,
          valor_pago: input.valor_pago,
          forma_pagamento: input.forma_pagamento,
          usuario_id: input.usuario_id,
          observacoes: input.observacoes ?? "",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDashboardQueries(qc);
      toast.success("Pagamento registrado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface PagamentoLoteInput {
  empresa_id: string;
  parcelas: ParcelaParaDistribuir[];
  valor_recebido: number;
  forma_pagamento: string;
  usuario_id: string;
  observacoes?: string;
}

/**
 * Registra um pagamento distribuído entre múltiplas parcelas.
 * A distribuição segue a regra: menor vencimento primeiro.
 * Insere um registro em `pagamentos` por cada parcela afetada (valor > 0).
 */
export function useRegistrarPagamentoLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PagamentoLoteInput) => {
      const resultado = distribuirPagamento(input.parcelas, input.valor_recebido);
      const afetadas = resultado.entradas.filter((e) => e.valorAplicado > 0);

      if (afetadas.length === 0) throw new Error("Nenhuma parcela será afetada com o valor informado.");

      const registros = afetadas.map((e) => ({
        empresa_id: input.empresa_id,
        parcela_id: e.parcelaId,
        valor_pago: e.valorAplicado,
        forma_pagamento: input.forma_pagamento,
        usuario_id: input.usuario_id,
        observacoes: input.observacoes ?? "",
      }));

      const { error } = await supabase.from("pagamentos").insert(registros);
      if (error) throw error;

      return resultado;
    },
    onSuccess: (resultado) => {
      invalidateDashboardQueries(qc);
      qc.invalidateQueries({ queryKey: ["parcelas"] });
      const quitadas = resultado.entradas.filter((e) => e.statusApos === "paga").length;
      const parciais = resultado.entradas.filter(
        (e) => e.statusApos === "parcial" && e.valorAplicado > 0
      ).length;
      const msgs = [];
      if (quitadas > 0) msgs.push(`${quitadas} quitada${quitadas > 1 ? "s" : ""}`);
      if (parciais > 0) msgs.push(`${parciais} parcial${parciais > 1 ? "is" : ""}`);
      toast.success(`Pagamento registrado! ${msgs.join(", ")}.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePagamentosDaParcela(parcelaId: string | null) {
  return useQuery({
    queryKey: ["pagamentos", parcelaId],
    enabled: !!parcelaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("parcela_id", parcelaId!)
        .order("data_pagamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePagamentos(filters?: { startDate?: Date; endDate?: Date }) {
  return useQuery({
    queryKey: ["pagamentos", filters],
    queryFn: async () => {
      let q = supabase.from("pagamentos").select("*, parcelas(*, clientes(nome))");

      if (filters?.startDate) {
        q = q.gte("data_pagamento", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        q = q.lte("data_pagamento", filters.endDate.toISOString());
      }

      const { data, error } = await q.order("data_pagamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
