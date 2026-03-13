import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface ClienteRecord {
  id: string;
  nome: string;
  email: string;
  cpf_cnpj: string;
  telefone: string;
  cidade: string;
  bairro: string;
  rua: string;
  cep: string;
  estado: string;
  uf: string;
  empresa_id: string;
  vendedor_id: string | null;
}

interface PortalAuth {
  session: Session | null;
  user: User | null;
  cliente: ClienteRecord | null;
  loading: boolean;
  isCliente: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithCPF: (cpf: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export function usePortalAuth(): PortalAuth {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cliente, setCliente] = useState<ClienteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCliente, setIsCliente] = useState(false);

  const fetchClienteData = useCallback(async (userId: string) => {
    try {
      // Check if user has 'cliente' role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const hasClienteRole = roles?.some((r: any) => r.role === "cliente") ?? false;
      setIsCliente(hasClienteRole);

      if (!hasClienteRole) {
        setCliente(null);
        return;
      }

      // Fetch the linked client record
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("id, nome, email, cpf_cnpj, telefone, cidade, bairro, rua, cep, estado, uf, empresa_id, vendedor_id")
        .eq("user_id", userId)
        .maybeSingle();

      setCliente(clienteData as ClienteRecord | null);
    } catch (err) {
      console.error("Erro ao carregar dados do cliente:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchClienteData(s.user.id);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchClienteData(s.user.id);
      } else {
        setCliente(null);
        setIsCliente(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchClienteData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithCPF = async (cpf: string, password: string) => {
    try {
      const normalizedCPF = cpf.replace(/\D/g, "");
      const { data, error } = await supabase.functions.invoke("portal-auth", {
        body: { action: "cpf-lookup", cpf: normalizedCPF },
      });

      if (error || !data?.email) {
        return { error: new Error("Credenciais inválidas") };
      }

      return signIn(data.email, password);
    } catch {
      return { error: new Error("Credenciais inválidas") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCliente(null);
    setIsCliente(false);
  };

  return { session, user, cliente, loading, isCliente, signIn, signInWithCPF, signOut };
}
