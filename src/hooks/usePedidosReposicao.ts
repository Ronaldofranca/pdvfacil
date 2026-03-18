import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PedidoReposicaoItem {
  id?: string;
  produto_id: string;
  quantidade_solicitada: number;
  quantidade_recebida?: number;
  custo_unitario: number;
  subtotal: number;
  observacao?: string;
  produtos?: { nome: string; codigo: string; unidade: string; imagem_url?: string | null };
}

export interface PedidoReposicao {
  id: string;
  empresa_id: string;
  numero: number;
  fornecedor_nome: string;
  status: string;
  observacoes: string;
  total_itens: number;
  total_valor: number;
  created_by: string;
  data_finalizacao: string | null;
  data_recebimento: string | null;
  created_at: string;
  updated_at: string;
  itens_pedido_reposicao?: PedidoReposicaoItem[];
}

export function usePedidosReposicao(statusFilter?: string) {
  return useQuery({
    queryKey: ["pedidos_reposicao", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("pedidos_reposicao" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "todos") {
        q = q.eq("status", statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as PedidoReposicao[];
    },
  });
}

export function usePedidoReposicaoDetalhes(pedidoId: string | null) {
  return useQuery({
    queryKey: ["pedido_reposicao_detalhes", pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data: pedido, error: pe } = await supabase
        .from("pedidos_reposicao" as any)
        .select("*")
        .eq("id", pedidoId!)
        .single();
      if (pe) throw pe;

      const { data: itens, error: ie } = await supabase
        .from("itens_pedido_reposicao" as any)
        .select("*, produtos(nome, codigo, unidade)")
        .eq("pedido_reposicao_id", pedidoId!);
      if (ie) throw ie;

      const result = pedido as any;
      result.itens_pedido_reposicao = itens;
      return result as PedidoReposicao;
    },
  });
}

export function useCreatePedidoReposicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      empresa_id: string;
      fornecedor_nome: string;
      observacoes?: string;
      created_by: string;
      itens: Omit<PedidoReposicaoItem, "id" | "produtos">[];
    }) => {
      const { data: pedido, error: pe } = await supabase
        .from("pedidos_reposicao" as any)
        .insert({
          empresa_id: input.empresa_id,
          fornecedor_nome: input.fornecedor_nome,
          observacoes: input.observacoes ?? "",
          created_by: input.created_by,
          status: "rascunho",
        })
        .select()
        .single();
      if (pe) throw pe;

      if (input.itens.length > 0) {
        const rows = input.itens.map((item) => ({
          pedido_reposicao_id: (pedido as any).id,
          empresa_id: input.empresa_id,
          produto_id: item.produto_id,
          quantidade_solicitada: item.quantidade_solicitada,
          custo_unitario: item.custo_unitario,
          subtotal: item.subtotal,
          observacao: item.observacao ?? "",
        }));
        const { error: ie } = await supabase.from("itens_pedido_reposicao" as any).insert(rows);
        if (ie) throw ie;
      }

      return pedido as unknown as PedidoReposicao;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos_reposicao"] });
      toast.success("Pedido de reposição criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePedidoReposicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      empresa_id: string;
      fornecedor_nome?: string;
      observacoes?: string;
      itens: Omit<PedidoReposicaoItem, "id" | "produtos">[];
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (input.fornecedor_nome !== undefined) updates.fornecedor_nome = input.fornecedor_nome;
      if (input.observacoes !== undefined) updates.observacoes = input.observacoes;

      const { error: pe } = await supabase
        .from("pedidos_reposicao" as any)
        .update(updates)
        .eq("id", input.id);
      if (pe) throw pe;

      // Replace items: delete all, re-insert
      await supabase.from("itens_pedido_reposicao" as any).delete().eq("pedido_reposicao_id", input.id);

      if (input.itens.length > 0) {
        const rows = input.itens.map((item) => ({
          pedido_reposicao_id: input.id,
          empresa_id: input.empresa_id,
          produto_id: item.produto_id,
          quantidade_solicitada: item.quantidade_solicitada,
          custo_unitario: item.custo_unitario,
          subtotal: item.subtotal,
          observacao: item.observacao ?? "",
        }));
        const { error: ie } = await supabase.from("itens_pedido_reposicao" as any).insert(rows);
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos_reposicao"] });
      qc.invalidateQueries({ queryKey: ["pedido_reposicao_detalhes"] });
      toast.success("Pedido atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFinalizarPedidoReposicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedidoId: string) => {
      const { error } = await supabase
        .from("pedidos_reposicao" as any)
        .update({ status: "finalizado", data_finalizacao: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", pedidoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos_reposicao"] });
      qc.invalidateQueries({ queryKey: ["pedido_reposicao_detalhes"] });
      toast.success("Pedido finalizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelarPedidoReposicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedidoId: string) => {
      const { error } = await supabase
        .from("pedidos_reposicao" as any)
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", pedidoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos_reposicao"] });
      qc.invalidateQueries({ queryKey: ["pedido_reposicao_detalhes"] });
      toast.success("Pedido cancelado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useConfirmarRecebimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pedido_id: string;
      vendedor_id: string;
      itens: { produto_id: string; quantidade_recebida: number }[];
    }) => {
      const { data, error } = await supabase.rpc("fn_confirmar_recebimento_reposicao" as any, {
        _pedido_id: input.pedido_id,
        _vendedor_id: input.vendedor_id,
        _itens: input.itens,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["pedidos_reposicao"] });
      qc.invalidateQueries({ queryKey: ["pedido_reposicao_detalhes"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
      const status = data?.status === "recebido" ? "totalmente recebido" : "parcialmente recebido";
      toast.success(`Recebimento confirmado! Pedido ${status}.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
