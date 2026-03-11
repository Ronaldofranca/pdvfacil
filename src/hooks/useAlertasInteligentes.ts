import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Alerta {
  id: string;
  tipo: "vencida" | "estoque" | "vip_inativo" | "meta_proxima";
  titulo: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  cor: string;
}

export function useAlertasInteligentes() {
  return useQuery({
    queryKey: ["alertas-inteligentes"],
    queryFn: async () => {
      const alertas: Alerta[] = [];

      // 1. Parcelas vencidas
      const { data: parcVencidas } = await supabase
        .from("parcelas")
        .select("id, cliente_id, valor_total, vencimento, clientes(nome)")
        .eq("status", "vencida")
        .limit(20);

      (parcVencidas || []).forEach((p: any) => {
        alertas.push({
          id: `venc-${p.id}`,
          tipo: "vencida",
          titulo: `Parcela vencida - ${p.clientes?.nome ?? "Cliente"}`,
          descricao: `R$ ${Number(p.valor_total).toFixed(2)} vencida em ${new Date(p.vencimento).toLocaleDateString("pt-BR")}`,
          prioridade: "alta",
          cor: "text-destructive",
        });
      });

      // 2. Estoque baixo (< 5 unidades)
      const { data: estBaixo } = await supabase
        .from("estoque")
        .select("id, quantidade, produtos(nome)")
        .lt("quantidade", 5)
        .limit(20);

      (estBaixo || []).forEach((e: any) => {
        alertas.push({
          id: `est-${e.id}`,
          tipo: "estoque",
          titulo: `Estoque baixo - ${e.produtos?.nome ?? "Produto"}`,
          descricao: `Apenas ${Number(e.quantidade)} unidades restantes`,
          prioridade: Number(e.quantidade) <= 0 ? "alta" : "media",
          cor: Number(e.quantidade) <= 0 ? "text-destructive" : "text-yellow-500",
        });
      });

      // 3. Clientes VIP inativos (sem compras há 30+ dias)
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: vendasRecentes } = await supabase
        .from("vendas")
        .select("cliente_id")
        .eq("status", "finalizada")
        .gte("data_venda", d30);

      const clientesAtivos = new Set((vendasRecentes || []).map((v) => v.cliente_id));

      const { data: todosClientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true);

      // Get top clients by purchase count
      const { data: todasVendas } = await supabase
        .from("vendas")
        .select("cliente_id, total")
        .eq("status", "finalizada");

      const clienteTotals = new Map<string, number>();
      (todasVendas || []).forEach((v) => {
        if (!v.cliente_id) return;
        clienteTotals.set(v.cliente_id, (clienteTotals.get(v.cliente_id) || 0) + Number(v.total));
      });

      (todosClientes || [])
        .filter((c) => !clientesAtivos.has(c.id) && (clienteTotals.get(c.id) || 0) >= 1000)
        .slice(0, 5)
        .forEach((c) => {
          alertas.push({
            id: `vip-${c.id}`,
            tipo: "vip_inativo",
            titulo: `Cliente VIP inativo - ${c.nome}`,
            descricao: `Sem compras há mais de 30 dias. Total histórico: R$ ${(clienteTotals.get(c.id) || 0).toFixed(2)}`,
            prioridade: "media",
            cor: "text-yellow-500",
          });
        });

      return alertas.sort((a, b) => {
        const p = { alta: 0, media: 1, baixa: 2 };
        return p[a.prioridade] - p[b.prioridade];
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}
