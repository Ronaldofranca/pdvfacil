import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Vendas por período ───
export function useRelVendasPeriodo(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_vendas_periodo", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, total, desconto_total, subtotal, data_venda, status, clientes(nome)")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Produtos vendidos ───
export function useRelProdutosVendidos(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_produtos_vendidos", inicio, fim],
    queryFn: async () => {
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("id")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any);
      if (vErr) throw vErr;
      if (!vendas?.length) return [];

      const vendaIds = vendas.map((v) => v.id);
      const { data, error } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, quantidade, preco_vendido, subtotal, bonus")
        .in("venda_id", vendaIds);
      if (error) throw error;

      // Agrupar por produto
      const map = new Map<string, { nome: string; qtd: number; receita: number; custo: number }>();
      for (const item of data ?? []) {
        const key = item.produto_id;
        const curr = map.get(key) ?? { nome: item.nome_produto, qtd: 0, receita: 0, custo: 0 };
        curr.qtd += Number(item.quantidade);
        curr.receita += Number(item.subtotal);
        map.set(key, curr);
      }

      return Array.from(map.entries())
        .map(([id, v]) => ({ produto_id: id, ...v }))
        .sort((a, b) => b.receita - a.receita);
    },
  });
}

// ─── Parcelas pagas ───
export function useRelParcelasPagas(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_parcelas_pagas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor_pago, forma_pagamento, data_pagamento")
        .gte("data_pagamento", inicio)
        .lte("data_pagamento", fim + "T23:59:59")
        .order("data_pagamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Parcelas vencidas ───
export function useRelParcelasVencidas() {
  return useQuery({
    queryKey: ["rel_parcelas_vencidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas")
        .select("*, clientes(nome)")
        .eq("status", "vencida" as any)
        .order("vencimento");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Lucro por produto (receita - custo) ───
export function useRelLucroProduto(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_lucro_produto", inicio, fim],
    queryFn: async () => {
      // Get vendas do periodo
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("id")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any);
      if (vErr) throw vErr;
      if (!vendas?.length) return [];

      const vendaIds = vendas.map((v) => v.id);
      const { data: itens, error: iErr } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, quantidade, preco_vendido, subtotal")
        .in("venda_id", vendaIds);
      if (iErr) throw iErr;

      // Get custos dos produtos
      const prodIds = [...new Set((itens ?? []).map((i) => i.produto_id))];
      const { data: produtos, error: pErr } = await supabase
        .from("produtos")
        .select("id, custo")
        .in("id", prodIds);
      if (pErr) throw pErr;

      const custoMap = new Map(produtos?.map((p) => [p.id, Number(p.custo)]) ?? []);

      const map = new Map<string, { nome: string; receita: number; custo: number; lucro: number; qtd: number }>();
      for (const item of itens ?? []) {
        const key = item.produto_id;
        const curr = map.get(key) ?? { nome: item.nome_produto, receita: 0, custo: 0, lucro: 0, qtd: 0 };
        const itemReceita = Number(item.subtotal);
        const itemCusto = (custoMap.get(key) ?? 0) * Number(item.quantidade);
        curr.receita += itemReceita;
        curr.custo += itemCusto;
        curr.lucro += itemReceita - itemCusto;
        curr.qtd += Number(item.quantidade);
        map.set(key, curr);
      }

      return Array.from(map.entries())
        .map(([id, v]) => ({ produto_id: id, ...v, margem: v.receita > 0 ? (v.lucro / v.receita) * 100 : 0 }))
        .sort((a, b) => b.lucro - a.lucro);
    },
  });
}

// ─── Curva ABC ───
export function useRelCurvaABC(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_curva_abc", inicio, fim],
    queryFn: async () => {
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("id")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any);
      if (vErr) throw vErr;
      if (!vendas?.length) return [];

      const vendaIds = vendas.map((v) => v.id);
      const { data: itens, error: iErr } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, subtotal")
        .in("venda_id", vendaIds);
      if (iErr) throw iErr;

      // Agrupar
      const map = new Map<string, { nome: string; receita: number }>();
      for (const item of itens ?? []) {
        const curr = map.get(item.produto_id) ?? { nome: item.nome_produto, receita: 0 };
        curr.receita += Number(item.subtotal);
        map.set(item.produto_id, curr);
      }

      const sorted = Array.from(map.entries())
        .map(([id, v]) => ({ produto_id: id, ...v }))
        .sort((a, b) => b.receita - a.receita);

      const totalReceita = sorted.reduce((s, i) => s + i.receita, 0);
      let acumulado = 0;

      return sorted.map((item) => {
        acumulado += item.receita;
        const pctAcumulado = totalReceita > 0 ? (acumulado / totalReceita) * 100 : 0;
        const classe = pctAcumulado <= 80 ? "A" : pctAcumulado <= 95 ? "B" : "C";
        return { ...item, pct: totalReceita > 0 ? (item.receita / totalReceita) * 100 : 0, pctAcumulado, classe };
      });
    },
  });
}
