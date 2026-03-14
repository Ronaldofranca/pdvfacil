import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

// Returns start/end of a local day as UTC ISO strings for proper timezone-aware filtering
function localDayRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function localDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export type DashboardPeriodo = "hoje" | "7dias" | "30dias" | "mes";

function getPeriodoRange(periodo: DashboardPeriodo): { start: string; end: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (periodo) {
    case "hoje": return localDayRange(now);
    case "7dias": {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 7);
      const e = new Date(todayStart);
      e.setDate(e.getDate() + 1);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    case "30dias": {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 30);
      const e = new Date(todayStart);
      e.setDate(e.getDate() + 1);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    case "mes": {
      const s = startOfMonth(now);
      const e = new Date(endOfMonth(now));
      e.setDate(e.getDate() + 1);
      return { start: new Date(s.getFullYear(), s.getMonth(), s.getDate()).toISOString(), end: new Date(e.getFullYear(), e.getMonth(), e.getDate()).toISOString() };
    }
  }
}

// Main dashboard data (today's KPIs - always loaded)
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard", localDayKey(new Date())],
    queryFn: async () => {
      const { start: hjStart, end: hjEnd } = localDayRange(new Date());

      // Vendas do dia (finalizadas)
      const { data: vendasHoje } = await supabase
        .from("vendas")
        .select("id, total, subtotal, data_venda, vendedor_id, pagamentos, clientes(nome)")
        .gte("data_venda", hjStart)
        .lt("data_venda", hjEnd)
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });

      // Vendas canceladas do dia
      const { data: canceladasHoje } = await supabase
        .from("vendas")
        .select("id, total")
        .gte("cancelado_em" as any, hjStart)
        .lt("cancelado_em" as any, hjEnd)
        .eq("status", "cancelada" as any);

      const totalVendasDia = vendasHoje?.reduce((s, v) => s + Number(v.total), 0) ?? 0;
      const qtdVendasDia = vendasHoje?.length ?? 0;

      // Lucro do dia — use custo_unitario snapshot from itens_venda
      const vendaIds = vendasHoje?.map((v) => v.id) ?? [];
      let lucroDia = 0;
      if (vendaIds.length > 0) {
        const { data: itens } = await supabase
          .from("itens_venda")
          .select("produto_id, quantidade, subtotal, custo_unitario")
          .in("venda_id", vendaIds);
        for (const item of itens ?? []) {
          lucroDia += Number(item.subtotal) - Number(item.custo_unitario ?? 0) * Number(item.quantidade);
        }
      }

      // Recebido hoje = pagamentos de parcelas + vendas à vista (não-crediário)
      const { data: pgtosHoje } = await supabase
        .from("pagamentos")
        .select("valor_pago")
        .gte("data_pagamento", hjStart)
        .lt("data_pagamento", hjEnd);
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

      const qtdCanceladasHoje = canceladasHoje?.length ?? 0;
      const totalCanceladoHoje = canceladasHoje?.reduce((s, v) => s + Number(v.total), 0) ?? 0;

      return {
        totalVendasDia, qtdVendasDia, lucroDia, recebidoHoje,
        totalVencido, qtdVencidas: vencidas?.length ?? 0,
        totalAReceber, qtdPendentes: pendentes?.length ?? 0,
        estoqueBaixo: estoqueBaixo ?? [],
        estoqueSemEstoque: (estoqueBaixo ?? []).filter((e: any) => Number(e.quantidade) <= 0).length,
        vendasRecentes: vendasHoje?.slice(0, 8) ?? [],
        parcelasVencidas: vencidas?.slice(0, 10) ?? [],
        qtdCanceladasHoje, totalCanceladoHoje,
      };
    },
    refetchInterval: 60000,
  });
}

// Period-based data (vendas, products, clients, vendedores)
export function useDashboardPeriodo(periodo: DashboardPeriodo) {
  const { start: inicio, end: fim } = getPeriodoRange(periodo);
  return useQuery({
    queryKey: ["dashboard_periodo", inicio, fim],
    queryFn: async () => {
      // Vendas do período
      const { data: vendas } = await supabase
        .from("vendas")
        .select("id, total, desconto_total, subtotal, data_venda, vendedor_id, cliente_id, pagamentos, clientes(nome)")
        .gte("data_venda", inicio)
        .lt("data_venda", fim)
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });

      const totalVendas = vendas?.reduce((s, v) => s + Number(v.total), 0) ?? 0;

      // Itens para produtos ranking e lucro
      const vendaIds = vendas?.map((v) => v.id) ?? [];
      let itens: any[] = [];
      if (vendaIds.length > 0) {
        const { data } = await supabase
          .from("itens_venda")
          .select("produto_id, nome_produto, quantidade, subtotal, custo_unitario")
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
        .lt("data_pagamento", fim);
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

      // Lucro do período — use custo_unitario snapshot
      let lucroPeriodo = 0;
      for (const it of itens) {
        lucroPeriodo += Number(it.subtotal) - Number(it.custo_unitario ?? 0) * Number(it.quantidade);
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
