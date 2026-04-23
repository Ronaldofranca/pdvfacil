import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateDashboardQueries } from "./useVendas";

export interface DevolucaoInput {
  venda_id: string;
  cliente_id: string | null;
  empresa_id: string;
  motivo: string;
  observacoes?: string;
  tipo_impacto: 'auto' | 'total_credito' | 'estoque_apenas';
  itens: {
    item_venda_id: string;
    produto_id: string;
    quantidade: number;
    valor_unitario: number;
  }[];
}

export function useDevolucoes() {
  return useQuery({
    queryKey: ["devolucoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devolucoes")
        .select("*, clientes(nome), vendas(total), itens_devolucao(*, produtos(nome))")
        .order("data_devolucao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDevolucao(id: string | null) {
  return useQuery({
    queryKey: ["devolucoes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devolucoes")
        .select("*, clientes(nome)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useDevolucaoItens(devolucaoId: string | null) {
  return useQuery({
    queryKey: ["itens_devolucao", devolucaoId],
    enabled: !!devolucaoId,
    queryFn: async () => {
      // Tenta a busca com join primeiro
      const { data, error } = await supabase
        .from("itens_devolucao")
        .select("*, produtos(nome)")
        .eq("devolucao_id", devolucaoId!);
      
      if (error) throw error;

      // Se por algum motivo o produtos(nome) vier nulo por falha de relacionamento, mas temos produto_id
      const itensComProdutos = await Promise.all((data || []).map(async (item: any) => {
        if (!item.produtos && item.produto_id) {
          const { data: p } = await supabase
            .from("produtos")
            .select("nome")
            .eq("id", item.produto_id)
            .single();
          if (p) return { ...item, produtos: p };
        }
        return item;
      }));

      return itensComProdutos;
    },
  });
}

export function useRegistrarDevolucao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DevolucaoInput) => {
      // We will use a RPC for atomicity to handle inventory and financial impact
      const { data, error } = await supabase.rpc("fn_registrar_devolucao" as any, {
        _venda_id: input.venda_id,
        _cliente_id: input.cliente_id,
        _empresa_id: input.empresa_id,
        _motivo: input.motivo,
        _observacoes: input.observacoes || "",
        _itens: input.itens,
        _tipo_impacto: input.tipo_impacto,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDashboardQueries(qc);
      qc.invalidateQueries({ queryKey: ["devolucoes"] });
      qc.invalidateQueries({ queryKey: ["credito_cliente"] });
      qc.invalidateQueries({ queryKey: ["itens_devolvidos_total"] });
      toast.success("Devolução registrada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao registrar devolução:", error);
      toast.error(error.message || "Erro ao registrar devolução");
    },
  });
}

export function useCreditoCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ["credito_cliente_saldo", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credito_clientes")
        .select("valor, tipo")
        .eq("cliente_id", clienteId!);
      if (error) throw error;
      
      const saldo = data?.reduce((acc, curr) => {
        return curr.tipo === "entrada" ? acc + Number(curr.valor) : acc - Number(curr.valor);
      }, 0) ?? 0;
      
      return saldo;
    },
  });
}

export function useVendaDevolucoes(vendaId: string | null) {
  return useQuery({
    queryKey: ["devolucoes", "venda", vendaId],
    enabled: !!vendaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devolucoes")
        .select("*")
        .eq("venda_id", vendaId!)
        .order("data_devolucao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Retorna o total acumulado já devolvido de cada item de uma venda específica
 */
export function useItensDevolvidosTotal(vendaId: string | null) {
  return useQuery({
    queryKey: ["itens_devolvidos_total", vendaId],
    enabled: !!vendaId,
    queryFn: async () => {
      // Busca todas as devoluções desta venda primeiro
      const { data: devs, error: devError } = await supabase
        .from("devolucoes")
        .select("id")
        .eq("venda_id", vendaId!);
      
      if (devError) throw devError;
      if (!devs || devs.length === 0) return {};

      const devIds = devs.map(d => d.id);

      // Busca os itens vinculados a essas devoluções
      const { data: itens, error: itemError } = await supabase
        .from("itens_devolucao")
        .select("item_venda_id, produto_id, quantidade")
        .in("devolucao_id", devIds);
      
      if (itemError) throw itemError;

      const totaisPorItem: Record<string, number> = {};
      const totaisPorProduto: Record<string, number> = {};
      
      itens?.forEach(item => {
        if (item.item_venda_id) {
          totaisPorItem[item.item_venda_id] = (totaisPorItem[item.item_venda_id] || 0) + Number(item.quantidade);
        }
        if (item.produto_id) {
          totaisPorProduto[item.produto_id] = (totaisPorProduto[item.produto_id] || 0) + Number(item.quantidade);
        }
      });

      console.log("Sincronismo de Devoluções:", { 
        vendaId, 
        porItem: totaisPorItem, 
        porProduto: totaisPorProduto 
      });

      return { porItem: totaisPorItem, porProduto: totaisPorProduto };
    }
  });
}

export function useSaldoGlobalCreditos() {
  return useQuery({
    queryKey: ["credito_cliente_saldo_global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credito_clientes")
        .select("valor, tipo");
      if (error) throw error;
      
      const saldo = data?.reduce((acc, curr) => {
        return curr.tipo === "entrada" ? acc + Number(curr.valor) : acc - Number(curr.valor);
      }, 0) ?? 0;
      
      return saldo;
    },
  });
}
