import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrevisaoProduto {
  produtoId: string;
  produtoNome: string;
  unidade: string;
  estoqueAtual: number;
  vendas30d: number;
  vendas90d: number;
  mediadiaria: number;
  diasEstoque: number;
  sugestaoReposicao: number;
  urgencia: "critico" | "baixo" | "ok";
}

export function usePrevisaoEstoque() {
  return useQuery({
    queryKey: ["previsao-estoque"],
    queryFn: async () => {
      const agora = new Date();
      const d30 = new Date(agora.getTime() - 30 * 86400000).toISOString();
      const d90 = new Date(agora.getTime() - 90 * 86400000).toISOString();

      // Estoque atual
      const { data: estoque } = await supabase
        .from("estoque")
        .select("produto_id, quantidade");

      // Itens vendidos nos últimos 90 dias
      const { data: vendas } = await supabase
        .from("vendas")
        .select("id, data_venda")
        .eq("status", "finalizada")
        .gte("data_venda", d90);

      const vendaIds = (vendas || []).map((v) => v.id);

      let itens: any[] = [];
      if (vendaIds.length > 0) {
        const { data } = await supabase
          .from("itens_venda")
          .select("produto_id, quantidade, venda_id")
          .in("venda_id", vendaIds.slice(0, 500));
        itens = data || [];
      }

      // Produtos
      const { data: produtos } = await supabase
        .from("produtos")
        .select("id, nome, unidade")
        .eq("ativo", true);

      // Build venda date map
      const vendaDateMap = new Map<string, string>();
      (vendas || []).forEach((v) => vendaDateMap.set(v.id, v.data_venda));

      // Aggregate per product
      const produtoMap = new Map<string, { vendas30: number; vendas90: number }>();
      itens.forEach((item) => {
        const dataVenda = vendaDateMap.get(item.venda_id);
        if (!dataVenda) return;
        const cur = produtoMap.get(item.produto_id) || { vendas30: 0, vendas90: 0 };
        cur.vendas90 += Number(item.quantidade);
        if (dataVenda >= d30) cur.vendas30 += Number(item.quantidade);
        produtoMap.set(item.produto_id, cur);
      });

      // Estoque map
      const estoqueMap = new Map<string, number>();
      (estoque || []).forEach((e) => {
        const cur = estoqueMap.get(e.produto_id) || 0;
        estoqueMap.set(e.produto_id, cur + Number(e.quantidade));
      });

      const previsoes: PrevisaoProduto[] = (produtos || []).map((p) => {
        const stats = produtoMap.get(p.id) || { vendas30: 0, vendas90: 0 };
        const estoqueAtual = estoqueMap.get(p.id) ?? 0;
        const mediaDiaria = stats.vendas30 > 0 ? stats.vendas30 / 30 : stats.vendas90 / 90;
        const diasEstoque = mediaDiaria > 0 ? Math.round(estoqueAtual / mediaDiaria) : 999;
        const sugestao = Math.max(0, Math.ceil(mediaDiaria * 30 - estoqueAtual));
        const urgencia: PrevisaoProduto["urgencia"] =
          diasEstoque <= 7 ? "critico" : diasEstoque <= 15 ? "baixo" : "ok";

        return {
          produtoId: p.id,
          produtoNome: p.nome,
          unidade: p.unidade,
          estoqueAtual,
          vendas30d: stats.vendas30,
          vendas90d: stats.vendas90,
          mediadiaria: Math.round(mediaDiaria * 10) / 10,
          diasEstoque,
          sugestaoReposicao: sugestao,
          urgencia,
        };
      });

      return previsoes.sort((a, b) => a.diasEstoque - b.diasEstoque);
    },
    staleTime: 10 * 60 * 1000,
  });
}
