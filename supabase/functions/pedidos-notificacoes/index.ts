import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT — must be authenticated
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

    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's empresa_id to scope notifications
    const { data: empresaId } = await callerClient.rpc("get_my_empresa_id");
    if (!empresaId) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const hoje = new Date().toISOString().split("T")[0];

    // Fetch pending orders scoped to caller's empresa
    const { data: pedidos, error: pErr } = await supabase
      .from("pedidos")
      .select("id, empresa_id, vendedor_id, cliente_id, data_prevista_entrega, status, valor_total, clientes(nome)")
      .eq("empresa_id", empresaId)
      .in("status", ["rascunho", "aguardando_entrega", "em_rota"]);

    if (pErr) throw pErr;
    if (!pedidos?.length) {
      return new Response(JSON.stringify({ created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifications: {
      empresa_id: string;
      usuario_id: string;
      titulo: string;
      mensagem: string;
      tipo: string;
    }[] = [];

    for (const p of pedidos) {
      const clienteNome = (p as any).clientes?.nome ?? "Cliente";
      const entrega = p.data_prevista_entrega;

      if (entrega < hoje) {
        notifications.push({
          empresa_id: p.empresa_id,
          usuario_id: p.vendedor_id,
          titulo: "⚠️ Pedido atrasado",
          mensagem: `Pedido de ${clienteNome} está atrasado (entrega prevista: ${entrega}).`,
          tipo: "warning",
        });
      } else if (entrega === hoje) {
        notifications.push({
          empresa_id: p.empresa_id,
          usuario_id: p.vendedor_id,
          titulo: "📦 Entrega para hoje",
          mensagem: `Pedido de ${clienteNome} deve ser entregue hoje.`,
          tipo: "info",
        });
      } else {
        const amanha = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        if (entrega === amanha) {
          notifications.push({
            empresa_id: p.empresa_id,
            usuario_id: p.vendedor_id,
            titulo: "📋 Entrega amanhã",
            mensagem: `Pedido de ${clienteNome} deve ser entregue amanhã.`,
            tipo: "info",
          });
        }
      }

      if (p.status === "em_rota") {
        notifications.push({
          empresa_id: p.empresa_id,
          usuario_id: p.vendedor_id,
          titulo: "🚚 Pedido em rota",
          mensagem: `Pedido de ${clienteNome} está em rota e ainda não foi entregue.`,
          tipo: "warning",
        });
      }
    }

    // Deduplicate: check if notification already exists today for same user+title
    let created = 0;
    for (const n of notifications) {
      const { data: existing } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("usuario_id", n.usuario_id)
        .eq("titulo", n.titulo)
        .gte("created_at", hoje + "T00:00:00")
        .limit(1);

      if (!existing?.length) {
        const { error } = await supabase.from("notificacoes").insert(n);
        if (!error) created++;
      }
    }

    return new Response(JSON.stringify({ created, total_checked: pedidos.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
