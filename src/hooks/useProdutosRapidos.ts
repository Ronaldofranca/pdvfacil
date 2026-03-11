import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/hooks/useVendas";

// Most sold products (by quantity in itens_venda)
export function useProdutosMaisVendidos(limit = 10) {
  return useQuery({
    queryKey: ["produtos_mais_vendidos", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, quantidade")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      // Aggregate by produto_id
      const map = new Map<string, { produto_id: string; nome: string; total: number }>();
      for (const item of data) {
        const existing = map.get(item.produto_id);
        if (existing) {
          existing.total += Number(item.quantidade);
        } else {
          map.set(item.produto_id, {
            produto_id: item.produto_id,
            nome: item.nome_produto,
            total: Number(item.quantidade),
          });
        }
      }

      return Array.from(map.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    },
  });
}

// Recently sold products (unique, ordered by most recent)
export function useProdutosRecentes(limit = 10) {
  return useQuery({
    queryKey: ["produtos_recentes", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Deduplicate keeping most recent
      const seen = new Set<string>();
      const result: { produto_id: string; nome: string }[] = [];
      for (const item of data) {
        if (!seen.has(item.produto_id)) {
          seen.add(item.produto_id);
          result.push({ produto_id: item.produto_id, nome: item.nome_produto });
          if (result.length >= limit) break;
        }
      }
      return result;
    },
  });
}

// Products sold to a specific client
export function useProdutosDoCliente(clienteId: string | null, limit = 10) {
  return useQuery({
    queryKey: ["produtos_cliente", clienteId, limit],
    enabled: !!clienteId,
    queryFn: async () => {
      // Get venda IDs for this client
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("id")
        .eq("cliente_id", clienteId!)
        .eq("status", "finalizada")
        .order("data_venda", { ascending: false })
        .limit(50);
      if (vErr) throw vErr;
      if (!vendas?.length) return [];

      const vendaIds = vendas.map((v) => v.id);
      const { data: itens, error: iErr } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, quantidade")
        .in("venda_id", vendaIds);
      if (iErr) throw iErr;

      const map = new Map<string, { produto_id: string; nome: string; total: number }>();
      for (const item of itens) {
        const existing = map.get(item.produto_id);
        if (existing) {
          existing.total += Number(item.quantidade);
        } else {
          map.set(item.produto_id, {
            produto_id: item.produto_id,
            nome: item.nome_produto,
            total: Number(item.quantidade),
          });
        }
      }

      return Array.from(map.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    },
  });
}
