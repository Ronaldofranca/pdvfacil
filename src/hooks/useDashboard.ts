import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const hoje = () => format(new Date(), "yyyy-MM-dd");

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard", hoje()],
    queryFn: async () => {
      const hj = hoje();

      // Vendas do dia
      const { data: vendasHoje } = await supabase
        .from("vendas")
        .select("id, total, subtotal, data_venda, clientes(nome)")
        .gte("data_venda", hj)
        .lte("data_venda", hj + "T23:59:59")
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });

      const totalVendasDia = vendasHoje?.reduce((s, v) => s + Number(v.total), 0) ?? 0;
      const qtdVendasDia = vendasHoje?.length ?? 0;

      // Lucro do dia (receita - custo)
      const vendaIds = vendasHoje?.map((v) => v.id) ?? [];
      let lucroDia = 0;
      if (vendaIds.length > 0) {
        const { data: itens } = await supabase
          .from("itens_venda")
          .select("produto_id, quantidade, subtotal")
          .in("venda_id", vendaIds);

        const prodIds = [...new Set((itens ?? []).map((i) => i.produto_id))];
        if (prodIds.length > 0) {
          const { data: produtos } = await supabase
            .from("produtos")
            .select("id, custo")
            .in("id", prodIds);
          const custoMap = new Map(produtos?.map((p) => [p.id, Number(p.custo)]) ?? []);

          for (const item of itens ?? []) {
            const receita = Number(item.subtotal);
            const custo = (custoMap.get(item.produto_id) ?? 0) * Number(item.quantidade);
            lucroDia += receita - custo;
          }
        }
      }

      // Parcelas vencidas
      const { data: vencidas } = await supabase
        .from("parcelas")
        .select("id, saldo")
        .eq("status", "vencida" as any);
      const totalVencido = vencidas?.reduce((s, p) => s + Number(p.saldo), 0) ?? 0;
      const qtdVencidas = vencidas?.length ?? 0;

      // Contas a receber (parcelas pendentes)
      const { data: pendentes } = await supabase
        .from("parcelas")
        .select("id, saldo")
        .eq("status", "pendente" as any);
      const totalAReceber = pendentes?.reduce((s, p) => s + Number(p.saldo), 0) ?? 0;

      // Estoque baixo (quantidade < 5)
      const { data: estoqueBaixo } = await supabase
        .from("estoque")
        .select("id, quantidade, produtos(nome, unidade)")
        .lt("quantidade", 5)
        .order("quantidade");

      return {
        totalVendasDia,
        qtdVendasDia,
        lucroDia,
        totalVencido,
        qtdVencidas,
        totalAReceber,
        estoqueBaixo: estoqueBaixo ?? [],
        vendasRecentes: vendasHoje?.slice(0, 5) ?? [],
      };
    },
    refetchInterval: 60000, // auto-refresh 1min
  });
}
