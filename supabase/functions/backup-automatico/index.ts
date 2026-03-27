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

const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || "";

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

// --- Google Drive Auth via Service Account ---

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJwt(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, enc.encode(unsignedToken));
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${unsignedToken}.${signatureB64}`;
}

async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createJwt(serviceAccount);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Google token error [${resp.status}]: ${txt}`);
  }
  const data = await resp.json();
  return data.access_token;
}

async function findOrCreateDriveFolder(accessToken: string, folderName: string, parentId: string): Promise<string> {
  if (!parentId) {
    throw new Error("ID da pasta pai (GOOGLE_DRIVE_FOLDER_ID) inválido ou vazio.");
  }

  // Search for existing folder
  const q = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResp.ok) {
    const errorBody = await searchResp.text();
    throw new Error(`Erro ao buscar pasta no Drive [${searchResp.status}]: ${errorBody}`);
  }

  const searchData = await searchResp.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createResp = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!createResp.ok) {
    const errorBody = await createResp.text();
    throw new Error(`Erro ao criar pasta no Drive [${createResp.status}]: ${errorBody}`);
  }

  const created = await createResp.json();
  return created.id;
}

async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  content: Uint8Array,
  folderId: string
): Promise<{ id: string; name: string }> {
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });

  const boundary = "backup_boundary_" + Date.now();
  const delimiter = `--${boundary}`;
  const closeDelimiter = `--${boundary}--`;

  const metaPart = `${delimiter}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
  const filePart = `${delimiter}\r\nContent-Type: text/csv\r\n\r\n`;
  const enc = new TextEncoder();

  const parts = [enc.encode(metaPart), enc.encode(filePart), content, enc.encode(`\r\n${closeDelimiter}`)];
  let totalLen = 0;
  for (const p of parts) totalLen += p.byteLength;
  const body = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.byteLength;
  }

  const resp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Drive upload error [${resp.status}]: ${txt}`);
  }
  return await resp.json();
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check
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

    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Collect CSV data for Google Drive upload
    const csvFiles: { name: string; data: Uint8Array }[] = [];

    for (const table of tablesToBackup) {
      try {
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

        // Upload to Supabase storage
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

        csvFiles.push({ name: `${table}.csv`, data: csvBytes });
        totalRecords += rows.length;
        totalSize += csvBytes.byteLength;
        tablesProcessed.push(table);
      } catch (err: any) {
        errors.push(`${table}: ${err.message}`);
      }
    }

    // Verification
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

    // --- Google Drive upload ---
    let driveStatus = "não configurado";
    let driveFiles: string[] = [];

    try {
      const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
      const driveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || GOOGLE_DRIVE_FOLDER_ID;

      if (!serviceAccountJson) {
        driveStatus = "não configurado";
        errors.push("Google Drive: Secret GOOGLE_SERVICE_ACCOUNT_KEY não configurada no Supabase.");
      } else if (!driveFolderId) {
        driveStatus = "não configurado";
        errors.push("Google Drive: Secret GOOGLE_DRIVE_FOLDER_ID não configurada no Supabase.");
      } else if (csvFiles.length > 0) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const accessToken = await getGoogleAccessToken(serviceAccount);

        // Create date subfolder inside parent folder
        const dateFolder = `${tipo}_${new Date().toISOString().slice(0, 10)}`;
        const subFolderId = await findOrCreateDriveFolder(accessToken, dateFolder, driveFolderId);

        for (const file of csvFiles) {
          try {
            const result = await uploadFileToDrive(accessToken, file.name, file.data, subFolderId);
            driveFiles.push(result.name);
          } catch (driveErr: any) {
            errors.push(`Drive ${file.name}: ${driveErr.message}`);
          }
        }

        driveStatus = driveFiles.length === csvFiles.length
          ? "sucesso"
          : driveFiles.length > 0
            ? "parcial"
            : "falha";
      }
    } catch (driveErr: any) {
      driveStatus = "falha";
      console.error("Erro crítico Google Drive:", driveErr);
      errors.push(`Erro Crítico Google Drive: ${driveErr.message}`);
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

    // Alert on failure
    if (status === "falha" || !verified || driveStatus === "falha") {
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
        google_drive: driveStatus,
        google_drive_arquivos: driveFiles,
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
