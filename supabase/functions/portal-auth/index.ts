import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, ...params } = await req.json();

    // ---- CPF Lookup: returns email for a given CPF ----
    if (action === "cpf-lookup") {
      const cpf = (params.cpf || "").replace(/\D/g, "");
      if (!cpf || cpf.length !== 11) {
        return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find client with portal access (user_id set) matching this CPF
      const { data: cliente, error } = await supabase
        .from("clientes")
        .select("email, user_id")
        .eq("cpf_cnpj", cpf)
        .not("user_id", "is", null)
        .maybeSingle();

      if (error || !cliente?.email) {
        // Generic error to prevent enumeration
        return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ email: cliente.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Activate Portal: admin creates auth account for a client ----
    if (action === "activate") {
      // Validate caller is authenticated and admin
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !caller) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check caller is admin or gerente
      const { data: callerRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id);

      const isPrivileged = callerRoles?.some((r: any) => r.role === "admin" || r.role === "gerente");
      if (!isPrivileged) {
        return new Response(JSON.stringify({ error: "Sem permissão" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { cliente_id, password } = params;
      if (!cliente_id || !password || password.length < 6) {
        return new Response(JSON.stringify({ error: "Dados inválidos. Senha deve ter no mínimo 6 caracteres." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch client record
      const { data: clienteData, error: cErr } = await supabase
        .from("clientes")
        .select("id, nome, email, cpf_cnpj, empresa_id, user_id")
        .eq("id", cliente_id)
        .maybeSingle();

      if (cErr || !clienteData) {
        return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (clienteData.user_id) {
        return new Response(JSON.stringify({ error: "Cliente já possui acesso ao portal" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!clienteData.email) {
        return new Response(JSON.stringify({ error: "Cliente precisa ter email cadastrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user with client role
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: clienteData.email,
        password,
        email_confirm: true,
        user_metadata: {
          empresa_id: clienteData.empresa_id,
          role: "cliente",
          cliente_id: clienteData.id,
          nome: clienteData.nome,
        },
      });

      if (createErr) {
        console.error("Erro ao criar usuário do portal:", createErr.message);
        return new Response(JSON.stringify({ error: "Não foi possível criar acesso. Verifique se o email já está em uso." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
