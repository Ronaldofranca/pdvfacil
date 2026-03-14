import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CRITICAL_TABLES = [
  "clientes",
  "cliente_telefones",
  "produtos",
  "kits",
  "kit_itens",
  "vendas",
  "itens_venda",
  "parcelas",
  "pagamentos",
  "pedidos",
  "itens_pedido",
  "estoque",
  "movimentos_estoque",
  "caixa_diario",
  "caixa_movimentacoes",
  "historico_compras",
  "audit_logs",
] as const;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check - require admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get empresa_id
    const { data: empresaId } = await userClient.rpc("get_my_empresa_id");
    if (!empresaId) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tipo = body.tipo || "completo";
    const tablesToBackup = tipo === "incremental"
      ? ["vendas", "parcelas", "pagamentos", "pedidos", "clientes"]
      : [...CRITICAL_TABLES];

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const prefix = `${empresaId}/${tipo}_${timestamp}`;
    let totalRecords = 0;
    let totalSize = 0;
    const errors: string[] = [];
    const tablesProcessed: string[] = [];

    for (const table of tablesToBackup) {
      try {
        // Use service role to bypass RLS and get all empresa data
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("empresa_id", empresaId)
          .limit(50000);

        if (error) {
          errors.push(`${table}: ${error.message}`);
          continue;
        }

        const rows = (data ?? []) as Record<string, unknown>[];
        if (rows.length === 0) {
          tablesProcessed.push(table);
          continue;
        }

        const bom = "\uFEFF";
        const csv = bom + toCsv(rows);
        const csvBytes = new TextEncoder().encode(csv);

        // Upload to storage
        const filePath = `${prefix}/${table}.csv`;
        const { error: uploadErr } = await supabase.storage
          .from("backups")
          .upload(filePath, csvBytes, {
            contentType: "text/csv;charset=utf-8",
            upsert: true,
          });

        if (uploadErr) {
          errors.push(`${table} upload: ${uploadErr.message}`);
          continue;
        }

        totalRecords += rows.length;
        totalSize += csvBytes.byteLength;
        tablesProcessed.push(table);
      } catch (err: any) {
        errors.push(`${table}: ${err.message}`);
      }
    }

    // Verification: check uploaded files exist
    let verified = true;
    for (const table of tablesProcessed) {
      const filePath = `${prefix}/${table}.csv`;
      const { data: fileData } = await supabase.storage
        .from("backups")
        .download(filePath);
      if (!fileData || fileData.size === 0) {
        verified = false;
        errors.push(`Verificação falhou: ${table}`);
      }
    }

    const status = errors.length === 0 ? "sucesso" : tablesProcessed.length > 0 ? "parcial" : "falha";

    // Log the backup
    await supabase.from("backup_logs").insert({
      empresa_id: empresaId,
      tipo,
      tabelas: tablesProcessed,
      status,
      arquivo_url: prefix,
      tamanho_bytes: totalSize,
      registros_total: totalRecords,
      erro: errors.length > 0 ? errors.join("; ") : null,
      verificado: verified,
      verificado_em: verified ? new Date().toISOString() : null,
    });

    // If backup failed, create notification alert
    if (status === "falha" || !verified) {
      await supabase.from("notificacoes").insert({
        empresa_id: empresaId,
        usuario_id: user.id,
        titulo: "⚠️ Falha no backup",
        mensagem: `Backup ${tipo} teve problemas: ${errors.join(", ")}`,
        tipo: "alerta",
      });
    }

    // Cleanup old backups (keep last 30)
    const { data: oldLogs } = await supabase
      .from("backup_logs")
      .select("id, arquivo_url")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .range(30, 999);

    if (oldLogs && oldLogs.length > 0) {
      for (const log of oldLogs) {
        if (log.arquivo_url) {
          // List and delete files in the prefix
          const { data: files } = await supabase.storage
            .from("backups")
            .list(log.arquivo_url);
          if (files && files.length > 0) {
            const paths = files.map((f: any) => `${log.arquivo_url}/${f.name}`);
            await supabase.storage.from("backups").remove(paths);
          }
        }
        await supabase.from("backup_logs").delete().eq("id", log.id);
      }
    }

    return new Response(
      JSON.stringify({
        status,
        tabelas: tablesProcessed,
        registros: totalRecords,
        tamanho: totalSize,
        verificado: verified,
        erros: errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
