import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface MergePreview {
  vendas: number;
  parcelas: number;
  pedidos: number;
  historico_compras: number;
  historico_cobrancas: number;
  devolucoes: number;
  creditos: number;
  enderecos: number;
  telefones: number;
  indicacoes_feitas: number;
  ledger_entries: number;
}

export function useMergePreview(clienteId: string | null) {
  return useQuery({
    queryKey: ["merge-preview", clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<MergePreview> => {
      const { data, error } = await (supabase as any).rpc("fn_get_merge_preview", {
        _cliente_id: clienteId
      });
      if (error) throw error;
      return data as unknown as MergePreview;
    }
  });
}

export function useMergeClientes() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      sourceId,
      targetId,
      reason,
      deleteSource = false
    }: {
      sourceId: string;
      targetId: string;
      reason: string;
      deleteSource?: boolean;
    }) => {
      if (!profile) throw new Error("Usuário não autenticado");

      const { data, error } = await (supabase as any).rpc("fn_merge_clientes", {
        _empresa_id: profile.empresa_id,
        _source_id: sourceId,
        _target_id: targetId,
        _merged_by: profile.id,
        _reason: reason
      });

      if (error) throw error;

      if (deleteSource) {
        // Optional: Physical deletion after successful merge
        const { error: delError } = await supabase
          .from("clientes")
          .delete()
          .eq("id", sourceId);
        if (delError) {
          console.error("Erro ao excluir cliente de origem:", delError);
          toast.warning("Mesclagem concluída, mas houve um erro ao excluir o cadastro antigo.");
        }
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["parcelas"] });
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      toast.success("Clientes mesclados com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao mesclar clientes");
    }
  });
}
