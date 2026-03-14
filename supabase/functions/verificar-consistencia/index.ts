import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Check if this is a scheduled/cron call
    const body = await req.json().catch(() => ({}));
    const isScheduled = body?.scheduled === true;

    let empresaId: string | null = null;

    if (isScheduled) {
      // Scheduled call: run for ALL empresas using service role
      // empresaId stays null to check all
    } else {
      // Manual call: validate JWT and admin role
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdminResult } = await callerClient.rpc("is_admin");
      if (!isAdminResult) {
        return new Response(
          JSON.stringify({ error: "Apenas administradores podem executar verificação de consistência" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: eid } = await callerClient.rpc("get_my_empresa_id");
      if (!eid) {
        return new Response(
          JSON.stringify({ error: "Empresa não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      empresaId = eid;
    }

    // ─── Use service role for data checks (bypasses RLS for cross-table integrity) ───
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const inconsistencias: Inconsistencia[] = [];

    // 1) Vendas com total diferente da soma dos itens
    const { data: vendasIncorretas } = await supabase.rpc("check_vendas_total", { _empresa_id: empresaId });
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
    const { data: parcelasIncorretas } = await supabase.rpc("check_parcelas_pagamentos", { _empresa_id: empresaId });

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
    const { data: parcelasVencidas } = await supabase.rpc("check_parcelas_vencidas", { _empresa_id: empresaId });

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
    const { data: saldoNegativo } = await supabase.rpc("check_saldo_negativo", { _empresa_id: empresaId });

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
    const { data: itensOrfaos } = await supabase.rpc("check_itens_orfaos", { _empresa_id: empresaId });

    if (itensOrfaos && itensOrfaos.length > 0 && itensOrfaos[0].qtd > 0) {
      inconsistencias.push({
        tipo: "ITENS_ORFAOS",
        descricao: `${itensOrfaos[0].qtd} item(ns) de venda sem venda associada`,
        gravidade: "media",
      });
    }

    // 6) Resumo financeiro para validação cruzada
    const { data: resumo } = await supabase.rpc("check_resumo_financeiro", { _empresa_id: empresaId });

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

    // Se encontrou inconsistências, notificar admins da empresa do caller
    if (inconsistencias.length > 0) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id, empresa_id")
        .eq("role", "admin")
        .eq("empresa_id", empresaId);

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
    console.error("Internal error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
