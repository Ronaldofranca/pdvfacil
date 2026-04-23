import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes } from "./useConfiguracoes";
import { parseISO, differenceInDays } from "date-fns";

export interface RotaScoreInfo {
  clienteId: string;
  clienteNome: string;
  latitude: number | null;
  longitude: number | null;
  cidade: string | null;
  telefone: string | null;
  valorEmAberto: number;
  diasSemCompra: number;
  ticketMedio: number;
  pedidosPendentes: number;
  maxDiasAtraso: number;
  limiteDisponivel: number;
  score: number;
  prioridade: "Alta" | "Media" | "Baixa";
}

export function useRotasV2() {
  const { data: config } = useConfiguracoes();

  return useQuery({
    queryKey: ["rotas-v2-scores"],
    enabled: !!config,
    queryFn: async () => {
      const carenciaGlobal = config?.carencia_dias_atraso ?? 15;

      // 1. Fetch clientes com localização e novos campos de crédito
      const { data: clientes, error: cErr } = await supabase
        .from("clientes")
        .select("id, nome, latitude, longitude, cidade, telefone, limite_credito_total, limite_utilizado, permitir_atraso")
        .eq("ativo", true);
      if (cErr) throw cErr;

      // 2. Fetch vendas finalizadas for last purchase date and total
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("cliente_id, data_venda, total")
        .eq("status", "finalizada");
      if (vErr) throw vErr;

      // 3. Fetch parcelas in aberto (pendente, vencida, parcial)
      const { data: parcelas, error: pErr } = await supabase
        .from("parcelas")
        .select("cliente_id, valor_total, valor_pago, vencimento")
        .in("status", ["pendente", "vencida", "parcial"]);
      if (pErr) throw pErr;

      // 4. Fetch pedidos pendentes
      const { data: pedidos, error: pedErr } = await supabase
        .from("pedidos")
        .select("cliente_id")
        .in("status", ["rascunho", "aguardando_entrega", "em_rota"]);
      if (pedErr) throw pedErr;

      const hoje = new Date().getTime();

      const scores: RotaScoreInfo[] = clientes.map((c) => {
        // Vendas do cliente
        const clienteVendas = vendas.filter((v) => v.cliente_id === c.id);
        const qtdCompras = clienteVendas.length;
        const totalComprado = clienteVendas.reduce((acc, v) => acc + Number(v.total), 0);
        const ticketMedio = qtdCompras > 0 ? totalComprado / qtdCompras : 0;

        // Dias sem compra
        let diasSemCompra = 999;
        if (qtdCompras > 0) {
          const ultVenda = clienteVendas.reduce((latest, v) => {
            const vDate = new Date(v.data_venda).getTime();
            return vDate > latest ? vDate : latest;
          }, 0);
          diasSemCompra = Math.max(0, Math.floor((hoje - ultVenda) / (1000 * 60 * 60 * 24)));
        }

        // Valor em aberto e atraso máximo
        const clienteParcelas = parcelas.filter((p) => p.cliente_id === c.id);
        const valorEmAberto = clienteParcelas.reduce((acc, p) => acc + (Number(p.valor_total) - Number(p.valor_pago || 0)), 0);
        
        let maxDiasAtraso = 0;
        const hojeDate = new Date();
        hojeDate.setHours(0,0,0,0);

        clienteParcelas.forEach(p => {
          if (p.vencimento) {
            const delay = differenceInDays(hojeDate, parseISO(p.vencimento));
            if (delay > maxDiasAtraso) maxDiasAtraso = delay;
          }
        });

        // Potencial de Compra
        const limiteTotal = c.limite_credito_total ?? config?.limite_padrao_credito ?? 1000;
        const limiteUtilizado = c.limite_utilizado ?? 0;
        const limiteDisponivel = Math.max(0, limiteTotal - limiteUtilizado);

        // Pedidos Pendentes
        const pedidosPendentes = pedidos.filter((p) => p.cliente_id === c.id).length;

        // --- NOVA FÓRMULA DE INTELIGÊNCIA ---
        // 1. Urgência de Cobrança (Se passou da carência, vira prioridade crítica)
        const urgenciaCobranca = maxDiasAtraso > carenciaGlobal ? (maxDiasAtraso * 10) + 500 : 0;
        
        // 2. Potencial de Venda (Limite disponível + Ticket Médio)
        const potencialVenda = (limiteDisponivel * 0.1) + (ticketMedio * 1.5);

        // 3. Recorrência (Dias sem compra)
        const recorrencia = (diasSemCompra === 999 ? 0 : diasSemCompra * 2);

        // Score Final Unificado
        const score = 
          urgenciaCobranca + 
          potencialVenda + 
          recorrencia + 
          (valorEmAberto * 1.2) +
          (pedidosPendentes > 0 ? 100 : 0);

        return {
          clienteId: c.id,
          clienteNome: c.nome,
          latitude: c.latitude ? Number(c.latitude) : null,
          longitude: c.longitude ? Number(c.longitude) : null,
          cidade: c.cidade,
          telefone: c.telefone,
          valorEmAberto,
          diasSemCompra: diasSemCompra === 999 ? -1 : diasSemCompra,
          maxDiasAtraso,
          limiteDisponivel,
          ticketMedio,
          pedidosPendentes,
          score,
          prioridade: "Baixa" as "Alta" | "Media" | "Baixa" // Will calculate later
        };
      });

      // Calcular Prioridade (Percentis)
      scores.sort((a, b) => b.score - a.score);
      const total = scores.length;
      
      scores.forEach((s, index) => {
        const percentil = (index + 1) / total;
        if (percentil <= 0.2) {
          s.prioridade = "Alta";
        } else if (percentil <= 0.5) {
          s.prioridade = "Media";
        } else {
          s.prioridade = "Baixa";
        }
      });

      return scores;
    },
    staleTime: 5 * 60 * 1000,
  });
}
