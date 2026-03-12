import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClienteScore {
  clienteId: string;
  clienteNome: string;
  totalComprado: number;
  qtdCompras: number;
  parcelasPagas: number;
  parcelasPagasEmDia: number;
  parcelasPagasComAtraso: number;
  parcelasVencidas: number;
  parcelasPendentes: number;
  tempoMedioPagamentoDias: number;
  score: number;
  percentualEmDia: number;
  classificacao: "Excelente" | "Bom" | "Regular" | "Risco";
  cor: string;
  emoji: string;
}

function calcScore(
  totalComprado: number,
  qtdCompras: number,
  parcelasPagasEmDia: number,
  parcelasPagasComAtraso: number,
  parcelasVencidas: number,
  tempoMedioDias: number
): {
  score: number;
  percentualEmDia: number;
  classificacao: ClienteScore["classificacao"];
  cor: string;
  emoji: string;
} {
  const totalParcelas = parcelasPagasEmDia + parcelasPagasComAtraso + parcelasVencidas;

  // Calculate on-time payment percentage
  let percentualEmDia = 0;
  if (totalParcelas > 0) {
    percentualEmDia = Math.round((parcelasPagasEmDia / totalParcelas) * 100);
  } else {
    // No parcelas yet - neutral
    percentualEmDia = 100;
  }

  // Build score (0-100)
  let score = 0;

  // On-time payment rate (0-50 points) - most important factor
  score += Math.round((percentualEmDia / 100) * 50);

  // Volume de compras (0-20)
  if (totalComprado >= 10000) score += 20;
  else if (totalComprado >= 5000) score += 15;
  else if (totalComprado >= 1000) score += 10;
  else if (totalComprado >= 500) score += 5;

  // Frequência (0-15)
  if (qtdCompras >= 20) score += 15;
  else if (qtdCompras >= 10) score += 10;
  else if (qtdCompras >= 5) score += 7;
  else if (qtdCompras >= 2) score += 3;

  // Tempo médio de pagamento (0-15)
  if (tempoMedioDias <= 0) score += 15;
  else if (tempoMedioDias <= 5) score += 12;
  else if (tempoMedioDias <= 15) score += 7;
  else if (tempoMedioDias <= 30) score += 3;

  // Classification based on on-time percentage (primary) and score (secondary)
  let classificacao: ClienteScore["classificacao"];
  let cor: string;
  let emoji: string;

  if (percentualEmDia >= 90 && score >= 60) {
    classificacao = "Excelente";
    cor = "text-primary";
    emoji = "⭐";
  } else if (percentualEmDia >= 70 && score >= 40) {
    classificacao = "Bom";
    cor = "text-blue-500";
    emoji = "👍";
  } else if (percentualEmDia >= 40) {
    classificacao = "Regular";
    cor = "text-yellow-500";
    emoji = "⚠️";
  } else {
    classificacao = "Risco";
    cor = "text-destructive";
    emoji = "🚨";
  }

  return { score, percentualEmDia, classificacao, cor, emoji };
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

      // Fetch parcelas with payment data
      const { data: parcelas, error: pErr } = await supabase
        .from("parcelas")
        .select("cliente_id, status, vencimento, data_pagamento, valor_pago, valor_total");
      if (pErr) throw pErr;

      const scores: ClienteScore[] = (clientes || []).map((c) => {
        const clienteVendas = (vendas || []).filter((v) => v.cliente_id === c.id);
        const totalComprado = clienteVendas.reduce((s, v) => s + Number(v.total), 0);
        const qtdCompras = clienteVendas.length;

        const clienteParcelas = (parcelas || []).filter((p) => p.cliente_id === c.id);

        // Classify each parcela
        let parcelasPagasEmDia = 0;
        let parcelasPagasComAtraso = 0;
        let parcelasVencidas = 0;
        let parcelasPendentes = 0;
        let parcelasPagas = 0;

        for (const p of clienteParcelas) {
          if (p.status === "paga") {
            parcelasPagas++;
            // Check if paid on time (data_pagamento <= vencimento)
            if (p.data_pagamento && p.vencimento) {
              const pagDate = new Date(p.data_pagamento).getTime();
              const vencDate = new Date(p.vencimento + "T23:59:59").getTime();
              if (pagDate <= vencDate) {
                parcelasPagasEmDia++;
              } else {
                parcelasPagasComAtraso++;
              }
            } else {
              // If no date info, assume on time
              parcelasPagasEmDia++;
            }
          } else if (p.status === "vencida") {
            parcelasVencidas++;
          } else {
            parcelasPendentes++;
          }
        }

        const pagasComData = clienteParcelas.filter(
          (p) => p.status === "paga" && p.data_pagamento && p.vencimento
        );
        let tempoMedioDias = 0;
        if (pagasComData.length > 0) {
          const totalDias = pagasComData.reduce((acc, p) => {
            const venc = new Date(p.vencimento + "T12:00:00").getTime();
            const pag = new Date(p.data_pagamento!).getTime();
            return acc + Math.max(0, (pag - venc) / 86400000);
          }, 0);
          tempoMedioDias = totalDias / pagasComData.length;
        }

        const { score, percentualEmDia, classificacao, cor, emoji } = calcScore(
          totalComprado,
          qtdCompras,
          parcelasPagasEmDia,
          parcelasPagasComAtraso,
          parcelasVencidas,
          tempoMedioDias
        );

        return {
          clienteId: c.id,
          clienteNome: c.nome,
          totalComprado,
          qtdCompras,
          parcelasPagas,
          parcelasPagasEmDia,
          parcelasPagasComAtraso,
          parcelasVencidas,
          parcelasPendentes,
          tempoMedioPagamentoDias: Math.round(tempoMedioDias),
          score,
          percentualEmDia,
          classificacao,
          cor,
          emoji,
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
