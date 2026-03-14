import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Action: reset (on successful login) — requires valid JWT
    if (action === "reset") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userErr } = await callerClient.auth.getUser();
      if (userErr || !user) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only allow resetting attempts for the authenticated user's own email
      if (user.email?.toLowerCase() !== normalizedEmail) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.rpc("reset_login_attempts", { _email: normalizedEmail });

      // Log successful login
      await supabaseAdmin.from("security_logs").insert({
        evento: "login_sucesso",
        detalhes: { email: normalizedEmail, ip },
        ip,
        user_agent: req.headers.get("user-agent") || "",
      });

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check (before login attempt) — no JWT needed (pre-auth)
    const { data, error } = await supabaseAdmin.rpc("check_login_attempt", {
      _email: normalizedEmail,
      _ip: ip,
      _max_attempts: 5,
      _window_minutes: 10,
      _block_minutes: 15,
    });

    if (error) {
      console.error("check_login_attempt error:", error);
      // Don't block login if rate limit check fails
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data as { blocked: boolean; attempts: number; remaining?: number; blocked_until?: string };

    // Log security events
    if (result.blocked) {
      await supabaseAdmin.from("security_logs").insert({
        evento: "login_bloqueado",
        detalhes: {
          email: normalizedEmail,
          ip,
          tentativas: result.attempts,
          bloqueado_ate: result.blocked_until,
        },
        ip,
        user_agent: req.headers.get("user-agent") || "",
      });
    } else {
      await supabaseAdmin.from("security_logs").insert({
        evento: "login_falhou",
        detalhes: {
          email: normalizedEmail,
          ip,
          tentativa: result.attempts,
          restantes: result.remaining,
        },
        ip,
        user_agent: req.headers.get("user-agent") || "",
      });
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ blocked: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
