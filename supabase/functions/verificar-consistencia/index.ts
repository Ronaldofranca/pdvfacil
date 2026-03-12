import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Inconsistencia {
  tipo: string;
  descricao: string;
  gravidade: "alta" | "media" | "baixa";
  detalhes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const inconsistencias: Inconsistencia[] = [];

    // 1) Vendas com total diferente da soma dos itens
    const { data: vendasIncorretas } = await supabase.rpc("check_vendas_total");

    if (vendasIncorretas && vendasIncorretas.length > 0) {
      inconsistencias.push({
        tipo: "VENDA_TOTAL_INCORRETO",
        descricao: `${vendasIncorretas.length} venda(s) com total divergente da soma dos itens`,
        gravidade: "alta",
        detalhes: vendasIncorretas
          .slice(0, 5)
          .map((v: any) => `Venda ${v.id.slice(0, 8)}: total=${v.total}, soma_itens=${v.soma_itens}`)
          .join("; "),
      });
    }

    // 2) Parcelas com valor_pago diferente da soma dos pagamentos
    const { data: parcelasIncorretas } = await supabase.rpc("check_parcelas_pagamentos");

    if (parcelasIncorretas && parcelasIncorretas.length > 0) {
      inconsistencias.push({
        tipo: "PARCELA_VALOR_DIVERGENTE",
        descricao: `${parcelasIncorretas.length} parcela(s) com valor_pago divergente dos pagamentos registrados`,
        gravidade: "alta",
        detalhes: parcelasIncorretas
          .slice(0, 5)
          .map((p: any) => `Parcela #${p.numero}: pago=${p.valor_pago}, soma=${p.soma_pagamentos}`)
          .join("; "),
      });
    }

    // 3) Parcelas vencidas ainda com status pendente
    const { data: parcelasVencidas } = await supabase.rpc("check_parcelas_vencidas");

    if (parcelasVencidas && parcelasVencidas.length > 0) {
      inconsistencias.push({
        tipo: "PARCELA_STATUS_INCORRETO",
        descricao: `${parcelasVencidas.length} parcela(s) vencida(s) ainda com status 'pendente'`,
        gravidade: "media",
        detalhes: `Vencimentos desde ${parcelasVencidas[0]?.vencimento || "N/A"}`,
      });

      // Auto-corrigir: atualizar status para 'vencida'
      const ids = parcelasVencidas.map((p: any) => p.id);
      await supabase
        .from("parcelas")
        .update({ status: "vencida" as any, updated_at: new Date().toISOString() })
        .in("id", ids);
    }

    // 4) Parcelas com saldo negativo
    const { data: saldoNegativo } = await supabase.rpc("check_saldo_negativo");

    if (saldoNegativo && saldoNegativo.length > 0) {
      inconsistencias.push({
        tipo: "PARCELA_SALDO_NEGATIVO",
        descricao: `${saldoNegativo.length} parcela(s) com saldo negativo (pagamento excedente)`,
        gravidade: "alta",
        detalhes: saldoNegativo
          .slice(0, 5)
          .map((p: any) => `Parcela #${p.numero}: saldo=${p.saldo}`)
          .join("; "),
      });
    }

    // 5) Itens de venda órfãos
    const { data: itensOrfaos } = await supabase.rpc("check_itens_orfaos");

    if (itensOrfaos && itensOrfaos.length > 0 && itensOrfaos[0].qtd > 0) {
      inconsistencias.push({
        tipo: "ITENS_ORFAOS",
        descricao: `${itensOrfaos[0].qtd} item(ns) de venda sem venda associada`,
        gravidade: "media",
      });
    }

    // 6) Resumo financeiro para validação cruzada
    const { data: resumo } = await supabase.rpc("check_resumo_financeiro");

    if (resumo && resumo.length > 0) {
      const r = resumo[0];
      const totalParcelado = Number(r.total_parcelas_valor || 0);
      const totalVendido = Number(r.total_vendas || 0);

      if (totalVendido > 0 && Math.abs(totalVendido - totalParcelado) > totalVendido * 0.05) {
        inconsistencias.push({
          tipo: "DIVERGENCIA_FINANCEIRA",
          descricao: `Divergência entre total vendido (R$${totalVendido.toFixed(2)}) e total parcelado (R$${totalParcelado.toFixed(2)})`,
          gravidade: "alta",
        });
      }
    }

    // Se encontrou inconsistências, notificar admins de cada empresa
    if (inconsistencias.length > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id, empresa_id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const mensagem = inconsistencias
          .map((i) => `⚠️ [${i.gravidade.toUpperCase()}] ${i.descricao}${i.detalhes ? `\n   ${i.detalhes}` : ""}`)
          .join("\n\n");

        const notificacoes = admins.map((admin) => ({
          empresa_id: admin.empresa_id,
          usuario_id: admin.user_id,
          titulo: `🔍 Verificação de Consistência: ${inconsistencias.length} problema(s) encontrado(s)`,
          mensagem,
          tipo: "warning",
        }));

        await supabase.from("notificacoes").insert(notificacoes);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inconsistencias_encontradas: inconsistencias.length,
        inconsistencias,
        correcoes_automaticas: inconsistencias.filter((i) => i.tipo === "PARCELA_STATUS_INCORRETO").length > 0
          ? ["Status de parcelas vencidas atualizado automaticamente"]
          : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
