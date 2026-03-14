import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateDashboardQueries } from "@/hooks/useVendas";

export function useParcelas(filters?: { vendaId?: string; clienteId?: string; status?: string }) {
  return useQuery({
    queryKey: ["parcelas", filters],
    queryFn: async () => {
      let q = supabase
        .from("parcelas")
        .select("*, clientes(nome), vendas(id)")
        .order("vencimento");
      if (filters?.vendaId) q = q.eq("venda_id", filters.vendaId);
      if (filters?.clienteId) q = q.eq("cliente_id", filters.clienteId);
      if (filters?.status) q = q.eq("status", filters.status as any);
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
      qc.invalidateQueries({ queryKey: ["parcelas"] });
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
      qc.invalidateQueries({ queryKey: ["parcelas"] });
      qc.invalidateQueries({ queryKey: ["pagamentos"] });
      toast.success("Pagamento registrado!");
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
