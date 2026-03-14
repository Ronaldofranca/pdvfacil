import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LedgerEntry {
  id: string;
  empresa_id: string;
  tipo_evento: string;
  referencia_tipo: string;
  referencia_id: string | null;
  cliente_id: string | null;
  venda_id: string | null;
  parcela_id: string | null;
  pagamento_id: string | null;
  caixa_id: string | null;
  valor: number;
  natureza: "debito" | "credito";
  descricao: string;
  created_at: string;
  created_by: string | null;
}

export function useLedger(filters?: { vendaId?: string; clienteId?: string; limit?: number }) {
  return useQuery({
    queryKey: ["financial_ledger", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("financial_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 200);
      if (filters?.vendaId) q = q.eq("venda_id", filters.vendaId);
      if (filters?.clienteId) q = q.eq("cliente_id", filters.clienteId);
      const { data, error } = await q;
      if (error) throw error;
      return data as LedgerEntry[];
    },
  });
}

export function useFraudAlerts() {
  return useQuery({
    queryKey: ["fraud_detection_logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fraud_detection_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}
