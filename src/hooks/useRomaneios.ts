import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RomaneioVenda {
  id: string;
  cliente_nome: string | null;
  total: number;
  data_venda: string;
  status: string;
}

export interface RomaneioGroup {
  vendedor_id: string;
  vendedor_nome: string;
  data: string;
  valor_total: number;
  vendas: RomaneioVenda[];
}

export function useRomaneios(dataFiltro: string) {
  return useQuery({
    queryKey: ["romaneios", dataFiltro],
    queryFn: async () => {
      const inicio = `${dataFiltro}T00:00:00`;
      const fim = `${dataFiltro}T23:59:59`;

      const { data: vendas, error } = await supabase
        .from("vendas")
        .select("id, vendedor_id, cliente_id, total, data_venda, status, clientes(nome)")
        .gte("data_venda", inicio)
        .lte("data_venda", fim)
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: true });

      if (error) throw error;

      // Buscar nomes dos vendedores
      const vendedorIds = [...new Set((vendas || []).map((v) => v.vendedor_id))];
      let profilesMap: Record<string, string> = {};
      if (vendedorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome")
          .in("user_id", vendedorIds);
        profiles?.forEach((p) => {
          profilesMap[p.user_id] = p.nome;
        });
      }

      // Agrupar por vendedor
      const groups: Record<string, RomaneioGroup> = {};
      (vendas || []).forEach((v) => {
        if (!groups[v.vendedor_id]) {
          groups[v.vendedor_id] = {
            vendedor_id: v.vendedor_id,
            vendedor_nome: profilesMap[v.vendedor_id] || "Vendedor",
            data: dataFiltro,
            valor_total: 0,
            vendas: [],
          };
        }
        groups[v.vendedor_id].valor_total += Number(v.total);
        groups[v.vendedor_id].vendas.push({
          id: v.id,
          cliente_nome: (v as any).clientes?.nome ?? null,
          total: Number(v.total),
          data_venda: v.data_venda,
          status: v.status,
        });
      });

      return Object.values(groups).sort((a, b) => b.valor_total - a.valor_total);
    },
  });
}
