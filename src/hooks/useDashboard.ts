import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const hoje = () => format(new Date(), "yyyy-MM-dd");

export type DashboardPeriodo = "hoje" | "7dias" | "30dias" | "mes";

function getPeriodoDates(periodo: DashboardPeriodo): { inicio: string; fim: string } {
  const now = new Date();
  const fim = format(now, "yyyy-MM-dd");
  switch (periodo) {
    case "hoje": return { inicio: fim, fim };
    case "7dias": return { inicio: format(subDays(now, 7), "yyyy-MM-dd"), fim };
    case "30dias": return { inicio: format(subDays(now, 30), "yyyy-MM-dd"), fim };
    case "mes": return { inicio: format(startOfMonth(now), "yyyy-MM-dd"), fim: format(endOfMonth(now), "yyyy-MM-dd") };
  }
}

// Main dashboard data (today's KPIs - always loaded)
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard", hoje()],
    queryFn: async () => {
      const hj = hoje();

      // Vendas do dia
      const { data: vendasHoje } = await supabase
        .from("vendas")
        .select("id, total, subtotal, data_venda, vendedor_id, pagamentos, clientes(nome)")
        .gte("data_venda", hj)
        .lte("data_venda", hj + "T23:59:59")
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });

      const totalVendasDia = vendasHoje?.reduce((s, v) => s + Number(v.total), 0) ?? 0;
      const qtdVendasDia = vendasHoje?.length ?? 0;

      // Lucro do dia
      const vendaIds = vendasHoje?.map((v) => v.id) ?? [];
      let lucroDia = 0;
      if (vendaIds.length > 0) {
        const { data: itens } = await supabase
          .from("itens_venda")
          .select("produto_id, quantidade, subtotal")
          .in("venda_id", vendaIds);
        const prodIds = [...new Set((itens ?? []).map((i) => i.produto_id))];
        if (prodIds.length > 0) {
          const { data: produtos } = await supabase.from("produtos").select("id, custo").in("id", prodIds);
          const custoMap = new Map(produtos?.map((p) => [p.id, Number(p.custo)]) ?? []);
          for (const item of itens ?? []) {
            lucroDia += Number(item.subtotal) - (custoMap.get(item.produto_id) ?? 0) * Number(item.quantidade);
          }
        }
      }

      // Recebido hoje = pagamentos de parcelas + vendas à vista (não-crediário)
      const { data: pgtosHoje } = await supabase
        .from("pagamentos")
        .select("valor_pago")
        .gte("data_pagamento", hj)
        .lte("data_pagamento", hj + "T23:59:59");
      const recebidoParcelas = pgtosHoje?.reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;

      // Somar valores à vista das vendas do dia (excluindo parcela crediário)
      let recebidoAVista = 0;
      for (const venda of vendasHoje ?? []) {
        const pgtos = (venda as any).pagamentos;
        if (Array.isArray(pgtos)) {
          for (const pg of pgtos) {
            if (pg.forma !== "crediario") {
              recebidoAVista += Number(pg.valor ?? 0);
            }
          }
        }
      }
      const recebidoHoje = recebidoParcelas + recebidoAVista;

      // Parcelas vencidas
      const { data: vencidas } = await supabase
        .from("parcelas")
        .select("id, saldo, cliente_id, clientes(nome), vencimento, numero")
        .eq("status", "vencida" as any)
        .order("vencimento");
      const totalVencido = vencidas?.reduce((s, p) => s + Number(p.saldo), 0) ?? 0;

      // Contas a receber (pendente + parcial + vencida)
      const { data: pendentes } = await supabase
        .from("parcelas")
        .select("id, saldo, status")
        .in("status", ["pendente", "parcial"] as any);
      const totalAReceber = (pendentes?.reduce((s, p) => s + Number(p.saldo), 0) ?? 0) + totalVencido;

      // Estoque baixo
      const { data: estoqueBaixo } = await supabase
        .from("estoque")
        .select("id, quantidade, produtos(nome, unidade)")
        .lt("quantidade", 5)
        .order("quantidade");

      return {
        totalVendasDia, qtdVendasDia, lucroDia, recebidoHoje,
        totalVencido, qtdVencidas: vencidas?.length ?? 0,
        totalAReceber, qtdPendentes: pendentes?.length ?? 0,
        estoqueBaixo: estoqueBaixo ?? [],
        estoqueSemEstoque: (estoqueBaixo ?? []).filter((e: any) => Number(e.quantidade) <= 0).length,
        vendasRecentes: vendasHoje?.slice(0, 8) ?? [],
        parcelasVencidas: vencidas?.slice(0, 10) ?? [],
      };
    },
    refetchInterval: 60000,
  });
}

// Period-based data (vendas, products, clients, vendedores)
export function useDashboardPeriodo(periodo: DashboardPeriodo) {
  const { inicio, fim } = getPeriodoDates(periodo);
  return useQuery({
    queryKey: ["dashboard_periodo", inicio, fim],
    queryFn: async () => {
      // Vendas do período
      const { data: vendas } = await supabase
        .from("vendas")
        .select("id, total, desconto_total, subtotal, data_venda, vendedor_id, cliente_id, pagamentos, clientes(nome)")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });

      const totalVendas = vendas?.reduce((s, v) => s + Number(v.total), 0) ?? 0;

      // Itens para produtos ranking e lucro
      const vendaIds = vendas?.map((v) => v.id) ?? [];
      let itens: any[] = [];
      if (vendaIds.length > 0) {
        const { data } = await supabase
          .from("itens_venda")
          .select("produto_id, nome_produto, quantidade, subtotal")
          .in("venda_id", vendaIds);
        itens = data ?? [];
      }

      // Produtos mais vendidos
      const prodMap = new Map<string, { nome: string; qtd: number; total: number }>();
      for (const it of itens) {
        const c = prodMap.get(it.produto_id) ?? { nome: it.nome_produto, qtd: 0, total: 0 };
        c.qtd += Number(it.quantidade);
        c.total += Number(it.subtotal);
        prodMap.set(it.produto_id, c);
      }
      const topProdutos = Array.from(prodMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);

      // Vendas por dia (chart)
      const porDia = new Map<string, number>();
      vendas?.forEach((v) => {
        const dia = format(new Date(v.data_venda), "dd/MM");
        porDia.set(dia, (porDia.get(dia) ?? 0) + Number(v.total));
      });
      const vendasPorDia = Array.from(porDia.entries()).map(([dia, total]) => ({ dia, total }));

      // Vendas por vendedor
      const porVendedor = new Map<string, { id: string; total: number; qtd: number }>();
      vendas?.forEach((v) => {
        const c = porVendedor.get(v.vendedor_id) ?? { id: v.vendedor_id, total: 0, qtd: 0 };
        c.total += Number(v.total); c.qtd += 1;
        porVendedor.set(v.vendedor_id, c);
      });

      // Clientes que mais compraram
      const porCliente = new Map<string, { nome: string; total: number; qtd: number }>();
      vendas?.forEach((v) => {
        const nome = (v as any).clientes?.nome ?? "Sem cliente";
        const c = porCliente.get(nome) ?? { nome, total: 0, qtd: 0 };
        c.total += Number(v.total); c.qtd += 1;
        porCliente.set(nome, c);
      });
      const topClientes = Array.from(porCliente.values()).sort((a, b) => b.total - a.total).slice(0, 10);

      // Recebimentos por forma = pagamentos de parcelas + vendas à vista
      const { data: pgtos } = await supabase
        .from("pagamentos")
        .select("valor_pago, forma_pagamento")
        .gte("data_pagamento", inicio)
        .lte("data_pagamento", fim + "T23:59:59");
      const porForma = new Map<string, number>();
      // 1. Pagamentos de parcelas
      pgtos?.forEach((p) => {
        const f = p.forma_pagamento || "outro";
        porForma.set(f, (porForma.get(f) ?? 0) + Number(p.valor_pago));
      });
      // 2. Vendas à vista (non-crediário portions)
      let recebidoAVistaP = 0;
      vendas?.forEach((v) => {
        const vpgtos = (v as any).pagamentos;
        if (Array.isArray(vpgtos)) {
          for (const pg of vpgtos) {
            if (pg.forma !== "crediario") {
              const val = Number(pg.valor ?? 0);
              recebidoAVistaP += val;
              const f = (pg.forma || "outro").replace(/_/g, " ");
              porForma.set(f, (porForma.get(f) ?? 0) + val);
            }
          }
        }
      });
      const recebimentosPorForma = Array.from(porForma.entries()).map(([forma, valor]) => ({ forma, valor }));
      const totalRecebido = (pgtos?.reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0) + recebidoAVistaP;

      // Vendedores - get names
      const vendedorIds = [...porVendedor.keys()];
      let vendedorNames = new Map<string, string>();
      if (vendedorIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome")
          .in("user_id", vendedorIds);
        profiles?.forEach((p) => vendedorNames.set(p.user_id, p.nome));
      }

      const rankingVendedores = Array.from(porVendedor.values())
        .map((v) => ({ ...v, nome: vendedorNames.get(v.id) ?? v.id.slice(0, 8) }))
        .sort((a, b) => b.total - a.total);

      // Metas
      const now = new Date();
      const { data: metas } = await supabase
        .from("metas_vendedor")
        .select("*")
        .eq("mes", now.getMonth() + 1)
        .eq("ano", now.getFullYear());

      const vendedoresComMeta = rankingVendedores.map((v) => {
        const meta = metas?.find((m) => m.vendedor_id === v.id);
        const metaValor = meta ? Number(meta.meta_valor) : 0;
        const pctMeta = metaValor > 0 ? (v.total / metaValor) * 100 : 0;
        const comissao = meta ? v.total * (Number(meta.percentual_comissao) / 100) : 0;
        return { ...v, metaValor, pctMeta, comissao };
      });

      // Lucro do período
      let lucroPeriodo = 0;
      if (itens.length > 0) {
        const prodIds = [...new Set(itens.map((i) => i.produto_id))];
        const { data: prods } = await supabase.from("produtos").select("id, custo").in("id", prodIds);
        const custoMap = new Map(prods?.map((p) => [p.id, Number(p.custo)]) ?? []);
        for (const it of itens) {
          lucroPeriodo += Number(it.subtotal) - (custoMap.get(it.produto_id) ?? 0) * Number(it.quantidade);
        }
      }

      return {
        totalVendas, qtdVendas: vendas?.length ?? 0, totalRecebido, lucroPeriodo,
        topProdutos, vendasPorDia, rankingVendedores: vendedoresComMeta,
        topClientes, recebimentosPorForma, vendedorNames,
      };
    },
    refetchInterval: 120000,
  });
}
