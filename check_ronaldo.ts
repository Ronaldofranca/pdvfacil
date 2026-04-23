import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

async function main() {
  const envContent = readFileSync(".env", "utf8");
  const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
  const anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
  const serviceKey = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
  
  if (!url || !serviceKey) {
    console.error("Missing credentials");
    return;
  }
  
  const adminClient = createClient(url, serviceKey);
  
  // 1. Get Ronaldo's profiles
  const { data: profiles, error: pError } = await adminClient.from("profiles").select("*").ilike("nome", "%Ronaldo%");
  console.log("Profiles named Ronaldo:", profiles);
  
  if (!profiles || profiles.length === 0) {
    console.log("No profile found.");
    return;
  }
  
  const ronaldo = profiles[0];
  
  // 2. Check user_roles for Ronaldo
  const { data: roles, error: rError } = await adminClient.from("user_roles").select("*").eq("user_id", ronaldo.user_id);
  console.log("Ronaldo's Roles:", roles);
  
  // 3. Test exactly the useRelVendedores query format
  const { data: q1, error: q1Err } = await adminClient
    .from("profiles")
    .select(`
      id,
      user_id, 
      nome, 
      email,
      user_roles!inner(role)
    `)
    .in("user_roles.role", ["vendedor", "master", "admin", "gerente"])
    .eq("user_id", ronaldo.user_id);
    
  console.log("Does useRelVendedores query return Ronaldo?", q1);
  if (q1Err) console.error(q1Err);
  
}
main();
