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
      // Timeout de segurança: Se em 7s não carregar, solta o spinner
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("PortalAuth: Tempo de resposta excedido no carregamento inicial.");
          setLoading(false);
        }
      }, 7000);

      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchClienteData(s.user.id);
        }
      } catch (err) {
        console.error("Erro ao inicializar PortalAuth:", err);
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      
      const sessionTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("PortalAuth: Tempo de resposta excedido na mudança de sessão.");
          setLoading(false);
        }
      }, 7000);

      try {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchClienteData(s.user.id);
        } else {
          setCliente(null);
          setIsCliente(false);
        }
      } catch (err) {
        console.error("Erro na mudança de sessão PortalAuth:", err);
      } finally {
        if (mounted) {
          clearTimeout(sessionTimeout);
          setLoading(false);
        }
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
      // Busca o email associado ao CPF via RPC SQL
      const { data, error } = await (supabase as any).rpc("fn_portal_cpf_lookup", { 
        p_cpf: normalizedCPF 
      });

      if (error || !data) {
        return { error: new Error("CPF nÃ£o encontrado ou nÃ£o habilitado.") };
      }

      // Supabase RPC returns a list of result objects
      const rows = Array.isArray(data) ? data : [data];
      const result = rows[0];

      if (!result) {
        return { error: new Error("CPF nÃ£o localizado.") };
      }

      const email = typeof result === 'string' ? result : (result as any).email;

      if (!email) {
        return { error: new Error("Cadastro incompleto. Fale com seu vendedor.") };
      }

      return signIn(email, password);
    } catch (err: any) {
      console.error("Erro no signInWithCPF:", err);
      return { error: new Error("Erro na comunicação com o servidor.") };
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
