import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

export interface DivergenciaItem {
  tipo: string;
  descricao: string;
  tabela: string;
  registro_id: string | null;
  cliente_nome: string;
  valor_esperado: number;
  valor_encontrado: number;
  diferenca: number;
}

export interface ConciliacaoResult {
  data: string;
  status: "ok" | "atencao" | "erro";
  total_vendas: number;
  total_recebido: number;
  total_crediario: number;
  total_parcelas_geradas: number;
  total_pagamentos: number;
  saldo_caixa: number;
  divergencias: DivergenciaItem[];
}

// Run reconciliation checks for a given date
async function executarConciliacao(dataStr: string, empresaId: string): Promise<ConciliacaoResult> {
  const inicio = dataStr;
  const fim = dataStr + "T23:59:59";
  const divergencias: DivergenciaItem[] = [];

  // 1. Vendas do dia
  const { data: vendas } = await supabase
    .from("vendas")
    .select("id, total, subtotal, desconto_total, status, cliente_id, clientes(nome)")
    .gte("data_venda", inicio)
    .lte("data_venda", fim)
    .eq("status", "finalizada" as any);

  const totalVendas = vendas?.reduce((s, v) => s + Number(v.total), 0) ?? 0;

  // 2. Pagamentos do dia
  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("id, valor_pago, parcela_id, forma_pagamento")
    .gte("data_pagamento", inicio)
    .lte("data_pagamento", fim);

  const totalPagamentos = pagamentos?.reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;

  // 3. Parcelas geradas no dia
  const { data: parcelas } = await supabase
    .from("parcelas")
    .select("id, valor_total, valor_pago, saldo, venda_id, cliente_id, clientes(nome), numero, status")
    .gte("created_at", inicio)
    .lte("created_at", fim);

  const totalParcelasGeradas = parcelas?.reduce((s, p) => s + Number(p.valor_total), 0) ?? 0;

  // 4. Crediário (parcelas pendentes/parciais geradas)
  const totalCrediario = parcelas
    ?.filter((p) => p.status !== "paga")
    ?.reduce((s, p) => s + Number(p.saldo ?? 0), 0) ?? 0;

  // 5. Caixa do dia
  const { data: caixas } = await supabase
    .from("caixa_diario")
    .select("id, saldo_teorico, valor_contado, status, total_entradas, total_sangrias")
    .eq("data", dataStr);

  const saldoCaixa = caixas?.[0] ? Number(caixas[0].saldo_teorico) : 0;

  // ========== VERIFICAÇÕES ==========

  // Check 1: Vendas sem itens
  if (vendas && vendas.length > 0) {
    const vendaIds = vendas.map((v) => v.id);
    const { data: itensVenda } = await supabase
      .from("itens_venda")
      .select("venda_id, subtotal")
      .in("venda_id", vendaIds);

    const itensPorVenda = new Map<string, number>();
    const totalPorVenda = new Map<string, number>();
    itensVenda?.forEach((i) => {
      itensPorVenda.set(i.venda_id, (itensPorVenda.get(i.venda_id) ?? 0) + 1);
      totalPorVenda.set(i.venda_id, (totalPorVenda.get(i.venda_id) ?? 0) + Number(i.subtotal));
    });

    for (const v of vendas) {
      const qtdItens = itensPorVenda.get(v.id) ?? 0;
      const somaItens = totalPorVenda.get(v.id) ?? 0;
      const clienteNome = (v as any).clientes?.nome ?? "Sem cliente";

      // Venda sem itens
      if (qtdItens === 0) {
        divergencias.push({
          tipo: "venda_sem_itens",
          descricao: `Venda finalizada sem itens registrados`,
          tabela: "vendas",
          registro_id: v.id,
          cliente_nome: clienteNome,
          valor_esperado: Number(v.total),
          valor_encontrado: 0,
          diferenca: Number(v.total),
        });
      }

      // Venda com total divergente dos itens
      if (qtdItens > 0 && Math.abs(Number(v.total) - somaItens) > 0.01) {
        divergencias.push({
          tipo: "venda_total_divergente",
          descricao: `Total da venda difere da soma dos itens`,
          tabela: "vendas",
          registro_id: v.id,
          cliente_nome: clienteNome,
          valor_esperado: somaItens,
          valor_encontrado: Number(v.total),
          diferenca: Math.abs(Number(v.total) - somaItens),
        });
      }
    }
  }

  // Check 2: Parcelas com valor diferente da venda
  if (parcelas) {
    const vendaIdsFromParcelas = [...new Set(parcelas.filter((p) => p.venda_id).map((p) => p.venda_id!))];
    if (vendaIdsFromParcelas.length > 0) {
      const { data: vendasRef } = await supabase
        .from("vendas")
        .select("id, total")
        .in("id", vendaIdsFromParcelas);

      const vendaMap = new Map(vendasRef?.map((v) => [v.id, Number(v.total)]) ?? []);

      // Group parcelas by venda_id
      const parcelasPorVenda = new Map<string, number>();
      parcelas.filter((p) => p.venda_id).forEach((p) => {
        parcelasPorVenda.set(p.venda_id!, (parcelasPorVenda.get(p.venda_id!) ?? 0) + Number(p.valor_total));
      });

      for (const [vendaId, totalParcelas] of parcelasPorVenda) {
        const totalVenda = vendaMap.get(vendaId) ?? 0;
        if (Math.abs(totalVenda - totalParcelas) > 0.01) {
          const clienteNome = parcelas.find((p) => p.venda_id === vendaId)
            ? ((parcelas.find((p) => p.venda_id === vendaId) as any).clientes?.nome ?? "")
            : "";
          divergencias.push({
            tipo: "parcela_valor_divergente",
            descricao: `Parcelas da venda com valor total diferente do valor da venda`,
            tabela: "parcelas",
            registro_id: vendaId,
            cliente_nome: clienteNome,
            valor_esperado: totalVenda,
            valor_encontrado: totalParcelas,
            diferenca: Math.abs(totalVenda - totalParcelas),
          });
        }
      }
    }
  }

  // Check 3: Pagamento com valor divergente da parcela
  if (pagamentos) {
    const parcelaIds = [...new Set(pagamentos.map((p) => p.parcela_id))];
    if (parcelaIds.length > 0) {
      const { data: parcelasRef } = await supabase
        .from("parcelas")
        .select("id, valor_total, valor_pago, cliente_id, clientes(nome)")
        .in("id", parcelaIds);

      const parcelaMap = new Map(parcelasRef?.map((p) => [p.id, p]) ?? []);

      // Sum payments per parcela
      const pgtosPorParcela = new Map<string, number>();
      pagamentos.forEach((p) => {
        pgtosPorParcela.set(p.parcela_id, (pgtosPorParcela.get(p.parcela_id) ?? 0) + Number(p.valor_pago));
      });

      for (const [parcelaId, totalPago] of pgtosPorParcela) {
        const parcela = parcelaMap.get(parcelaId);
        if (parcela && totalPago > Number(parcela.valor_total) * 1.001) {
          divergencias.push({
            tipo: "pagamento_excede_parcela",
            descricao: `Pagamento excede o valor da parcela`,
            tabela: "pagamentos",
            registro_id: parcelaId,
            cliente_nome: (parcela as any).clientes?.nome ?? "",
            valor_esperado: Number(parcela.valor_total),
            valor_encontrado: totalPago,
            diferenca: totalPago - Number(parcela.valor_total),
          });
        }
      }
    }
  }

  // Check 4: Caixa vs financeiro (dinheiro)
  if (caixas && caixas.length > 0 && pagamentos) {
    const recebidoDinheiro = pagamentos
      .filter((p) => p.forma_pagamento === "dinheiro")
      .reduce((s, p) => s + Number(p.valor_pago), 0);

    const entradasCaixa = Number(caixas[0].total_entradas);
    // Rough check: entries in cash should approximate cash payments
    if (recebidoDinheiro > 0 && Math.abs(entradasCaixa - recebidoDinheiro) > 1) {
      divergencias.push({
        tipo: "caixa_financeiro_divergente",
        descricao: `Entradas do caixa diferem dos recebimentos em dinheiro`,
        tabela: "caixa_diario",
        registro_id: caixas[0].id,
        cliente_nome: "",
        valor_esperado: recebidoDinheiro,
        valor_encontrado: entradasCaixa,
        diferenca: Math.abs(entradasCaixa - recebidoDinheiro),
      });
    }
  }

  const status: ConciliacaoResult["status"] =
    divergencias.length === 0 ? "ok" : divergencias.some((d) => d.diferenca > 10) ? "erro" : "atencao";

  return {
    data: dataStr,
    status,
    total_vendas: totalVendas,
    total_recebido: totalPagamentos,
    total_crediario: totalCrediario,
    total_parcelas_geradas: totalParcelasGeradas,
    total_pagamentos: totalPagamentos,
    saldo_caixa: saldoCaixa,
    divergencias,
  };
}

export function useConciliacaoHistorico() {
  return useQuery({
    queryKey: ["conciliacoes_historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conciliacoes")
        .select("*")
        .order("data", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useConciliacaoItens(conciliacaoId: string | null) {
  return useQuery({
    queryKey: ["conciliacao_itens", conciliacaoId],
    enabled: !!conciliacaoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conciliacao_itens")
        .select("*")
        .eq("conciliacao_id", conciliacaoId!)
        .order("diferenca", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExecutarConciliacao() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dataStr: string) => {
      if (!profile?.empresa_id) throw new Error("Sem empresa");

      const result = await executarConciliacao(dataStr, profile.empresa_id);

      // Upsert conciliation record
      const { data: existing } = await supabase
        .from("conciliacoes")
        .select("id")
        .eq("data", dataStr)
        .maybeSingle();

      let conciliacaoId: string;

      if (existing) {
        // Delete old items
        await supabase.from("conciliacao_itens").delete().eq("conciliacao_id", existing.id);
        
        const { error } = await supabase
          .from("conciliacoes")
          .update({
            status: result.status,
            total_vendas: result.total_vendas,
            total_recebido: result.total_recebido,
            total_crediario: result.total_crediario,
            total_parcelas_geradas: result.total_parcelas_geradas,
            total_pagamentos: result.total_pagamentos,
            saldo_caixa: result.saldo_caixa,
            total_divergencias: result.divergencias.length,
            valor_divergente: result.divergencias.reduce((s, d) => s + d.diferenca, 0),
            usuario_id: profile.user_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
        conciliacaoId = existing.id;
      } else {
        const { data: inserted, error } = await supabase
          .from("conciliacoes")
          .insert({
            empresa_id: profile.empresa_id,
            data: dataStr,
            status: result.status,
            total_vendas: result.total_vendas,
            total_recebido: result.total_recebido,
            total_crediario: result.total_crediario,
            total_parcelas_geradas: result.total_parcelas_geradas,
            total_pagamentos: result.total_pagamentos,
            saldo_caixa: result.saldo_caixa,
            total_divergencias: result.divergencias.length,
            valor_divergente: result.divergencias.reduce((s, d) => s + d.diferenca, 0),
            usuario_id: profile.user_id,
          })
          .select("id")
          .single();
        if (error) throw error;
        conciliacaoId = inserted.id;
      }

      // Insert divergence items
      if (result.divergencias.length > 0) {
        const itens = result.divergencias.map((d) => ({
          conciliacao_id: conciliacaoId,
          empresa_id: profile.empresa_id,
          tipo: d.tipo,
          descricao: d.descricao,
          tabela: d.tabela,
          registro_id: d.registro_id ?? undefined,
          cliente_nome: d.cliente_nome,
          valor_esperado: d.valor_esperado,
          valor_encontrado: d.valor_encontrado,
          diferenca: d.diferenca,
        }));
        const { error: itensError } = await supabase.from("conciliacao_itens").insert(itens);
        if (itensError) throw itensError;
      }

      return { ...result, conciliacao_id: conciliacaoId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["conciliacoes_historico"] });
      qc.invalidateQueries({ queryKey: ["conciliacao_itens"] });
      const msg =
        result.status === "ok"
          ? "Conciliação OK — sem divergências"
          : `Conciliação concluída — ${result.divergencias.length} divergência(s) encontrada(s)`;
      toast[result.status === "ok" ? "success" : "warning"](msg);
    },
    onError: (e: any) => toast.error("Erro na conciliação: " + e.message),
  });
}
