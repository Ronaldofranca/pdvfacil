import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Validate caller JWT ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await callerClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Não autorizado" }, 401);
    }

    // ── Only admins can reset passwords ─────────────────────────────────────
    const { data: isAdminResult } = await callerClient.rpc("is_admin");
    if (!isAdminResult) {
      return json({ error: "Apenas administradores podem redefinir senhas" }, 403);
    }

    // ── Parse and validate body ──────────────────────────────────────────────
    const body = await req.json();
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!userId) {
      return json({ error: "user_id é obrigatório" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // ── Guard: ensure the target user belongs to the same empresa ───────────
    const { data: empresaId } = await callerClient.rpc("get_my_empresa_id");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify the target user_id is a client of the same empresa
    const { data: cliente, error: clienteError } = await adminClient
      .from("clientes")
      .select("id, nome")
      .eq("user_id", userId)
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return json(
        { error: "Cliente não encontrado nesta empresa ou sem acesso ao portal" },
        404
      );
    }

    // ── Update the password via Admin API ────────────────────────────────────
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error("Password update error:", updateError.message);
      return json({ error: "Erro ao atualizar senha: " + updateError.message }, 500);
    }

    console.log(
      `Admin ${claimsData.claims.sub} redefiniu a senha do cliente ${cliente.nome} (user_id=${userId})`
    );

    return json({
      success: true,
      message: `Senha redefinida com sucesso para ${cliente.nome}`,
    });
  } catch (err) {
    console.error("Internal error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
