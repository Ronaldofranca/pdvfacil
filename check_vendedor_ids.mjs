import { createClient } from "@supabase/supabase-js";

const url = "https://hohaayteffgzaczymayy.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvaGFheXRlZmZnemFjenltYXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTUxNDEsImV4cCI6MjA4ODgzMTE0MX0.rf8j4Pxk-T4YxphkhJOl18rIsUDuTU6-BJUa83OoHbA";

const sb = createClient(url, anonKey);

async function main() {
  // 1. Buscar todos os profiles
  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id, user_id, nome, email");
  
  if (pErr) { console.error("Erro profiles:", pErr.message); return; }
  console.log("\n=== PROFILES ===");
  profiles?.forEach(p => console.log(`  nome=${p.nome} | id=${p.id} | user_id=${p.user_id}`));

  // 2. Buscar vendedor_ids distintos nas vendas
  const { data: vendas, error: vErr } = await sb
    .from("vendas")
    .select("vendedor_id")
    .eq("status", "finalizada")
    .limit(200);

  if (vErr) { console.error("Erro vendas:", vErr.message); return; }
  
  const vendedorIds = [...new Set(vendas?.map(v => v.vendedor_id))];
  console.log("\n=== VENDEDOR_IDs ÚNICOS NAS VENDAS ===");
  console.log(vendedorIds);

  // 3. Cruzar
  console.log("\n=== CRUZAMENTO ===");
  vendedorIds.forEach(vid => {
    const porUserId = profiles?.find(p => p.user_id === vid);
    const porId = profiles?.find(p => p.id === vid);
    console.log(`vendedor_id=${vid}`);
    console.log(`  -> por user_id: ${porUserId?.nome ?? "NÃO ENCONTRADO"}`);
    console.log(`  -> por id:      ${porId?.nome ?? "NÃO ENCONTRADO"}`);
  });
}

main();
