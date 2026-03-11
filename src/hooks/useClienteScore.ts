import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClienteScore {
  clienteId: string;
  clienteNome: string;
  totalComprado: number;
  qtdCompras: number;
  parcelasPagas: number;
  parcelasVencidas: number;
  tempoMedioPagamentoDias: number;
  score: number;
  classificacao: "VIP" | "Bom" | "Comum" | "Risco";
  cor: string;
}

function calcScore(
  totalComprado: number,
  qtdCompras: number,
  parcelasPagas: number,
  parcelasVencidas: number,
  tempoMedioDias: number
): { score: number; classificacao: ClienteScore["classificacao"]; cor: string } {
  let score = 0;

  // Volume de compras (0-30)
  if (totalComprado >= 10000) score += 30;
  else if (totalComprado >= 5000) score += 22;
  else if (totalComprado >= 1000) score += 15;
  else if (totalComprado >= 500) score += 8;

  // Frequência (0-25)
  if (qtdCompras >= 20) score += 25;
  else if (qtdCompras >= 10) score += 18;
  else if (qtdCompras >= 5) score += 12;
  else if (qtdCompras >= 2) score += 6;

  // Adimplência (0-30)
  const totalParcelas = parcelasPagas + parcelasVencidas;
  if (totalParcelas > 0) {
    const taxaPaga = parcelasPagas / totalParcelas;
    score += Math.round(taxaPaga * 30);
  } else {
    score += 15;
  }

  // Tempo médio de pagamento (0-15)
  if (tempoMedioDias <= 5) score += 15;
  else if (tempoMedioDias <= 15) score += 10;
  else if (tempoMedioDias <= 30) score += 5;

  const classificacao: ClienteScore["classificacao"] =
    score >= 80 ? "VIP" : score >= 55 ? "Bom" : score >= 30 ? "Comum" : "Risco";

  const cor =
    classificacao === "VIP"
      ? "text-primary"
      : classificacao === "Bom"
      ? "text-blue-500"
      : classificacao === "Comum"
      ? "text-muted-foreground"
      : "text-destructive";

  return { score, classificacao, cor };
}

export function useClienteScores() {
  return useQuery({
    queryKey: ["cliente-scores"],
    queryFn: async () => {
      // Fetch all clients
      const { data: clientes, error: cErr } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true);
      if (cErr) throw cErr;

      // Fetch vendas grouped by client
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("cliente_id, total")
        .eq("status", "finalizada");
      if (vErr) throw vErr;

      // Fetch parcelas
      const { data: parcelas, error: pErr } = await supabase
        .from("parcelas")
        .select("cliente_id, status, vencimento, data_pagamento");
      if (pErr) throw pErr;

      const scores: ClienteScore[] = (clientes || []).map((c) => {
        const clienteVendas = (vendas || []).filter((v) => v.cliente_id === c.id);
        const totalComprado = clienteVendas.reduce((s, v) => s + Number(v.total), 0);
        const qtdCompras = clienteVendas.length;

        const clienteParcelas = (parcelas || []).filter((p) => p.cliente_id === c.id);
        const parcelasPagas = clienteParcelas.filter((p) => p.status === "paga").length;
        const parcelasVencidas = clienteParcelas.filter((p) => p.status === "vencida").length;

        const pagasComData = clienteParcelas.filter(
          (p) => p.status === "paga" && p.data_pagamento && p.vencimento
        );
        let tempoMedioDias = 10;
        if (pagasComData.length > 0) {
          const totalDias = pagasComData.reduce((acc, p) => {
            const venc = new Date(p.vencimento).getTime();
            const pag = new Date(p.data_pagamento!).getTime();
            return acc + Math.max(0, (pag - venc) / 86400000);
          }, 0);
          tempoMedioDias = totalDias / pagasComData.length;
        }

        const { score, classificacao, cor } = calcScore(
          totalComprado,
          qtdCompras,
          parcelasPagas,
          parcelasVencidas,
          tempoMedioDias
        );

        return {
          clienteId: c.id,
          clienteNome: c.nome,
          totalComprado,
          qtdCompras,
          parcelasPagas,
          parcelasVencidas,
          tempoMedioPagamentoDias: Math.round(tempoMedioDias),
          score,
          classificacao,
          cor,
        };
      });

      return scores.sort((a, b) => b.score - a.score);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useClienteScoreById(clienteId: string | null) {
  const { data: allScores } = useClienteScores();
  if (!clienteId || !allScores) return null;
  return allScores.find((s) => s.clienteId === clienteId) ?? null;
}
