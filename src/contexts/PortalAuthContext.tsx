import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
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
  signInWithConta: (login: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuth | undefined>(undefined);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
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

  const aggressiveSessionCleanup = useCallback(() => {
    // Termina qualquer deadlock limpando as chaves de sessão corrompidas do localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error("Erro ao limpar localStorage:", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("PortalAuth: Tempo de resposta excedido no carregamento inicial. Forçando quebra de deadlock.");
          aggressiveSessionCleanup();
          setSession(null);
          setUser(null);
          setCliente(null);
          setIsCliente(false);
          setLoading(false);
        }
      }, 7000);

      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        
        if (error) {
           console.warn("PortalAuth: Erro validando sessão. Limpando resíduos.", error);
           aggressiveSessionCleanup();
        }

        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchClienteData(s.user.id);
        } else {
          setCliente(null);
          setIsCliente(false);
        }
      } catch (err) {
        console.error("Erro ao inicializar PortalAuth:", err);
        aggressiveSessionCleanup();
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      
      const sessionTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("PortalAuth: Timeout no AuthStateChange. Quebrando deadlock.");
          aggressiveSessionCleanup();
          setLoading(false);
        }
      }, 7000);

      try {
        if (event === 'SIGNED_OUT') {
           aggressiveSessionCleanup();
        }

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
  }, [fetchClienteData, aggressiveSessionCleanup]);

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
      const { data, error } = await (supabase as any).rpc("fn_portal_cpf_lookup", { 
        p_cpf: normalizedCPF 
      });

      if (error || !data) {
        return { error: new Error("CPF não encontrado ou não habilitado.") };
      }

      const rows = Array.isArray(data) ? data : [data];
      const result = rows[0];

      if (!result) {
        return { error: new Error("CPF não localizado.") };
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

  const signInWithConta = async (login: string, password: string) => {
    try {
      const { data: email, error } = await (supabase as any).rpc("fn_portal_login_conta", { 
        p_login: login.trim() 
      });

      if (error || !email) {
        return { error: new Error("Login não encontrado ou desativado.") };
      }

      return signIn(email, password);
    } catch (err: any) {
      console.error("Erro no signInWithConta:", err);
      return { error: new Error("Erro na comunicação com o servidor.") };
    }
  };

  const signOut = async () => {
    aggressiveSessionCleanup();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCliente(null);
    setIsCliente(false);
  };

  const value = {
    session,
    user,
    cliente,
    loading,
    isCliente,
    signIn,
    signInWithCPF,
    signInWithConta,
    signOut
  };

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

// Hook padronizado para as views
export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (context === undefined) {
    throw new Error("usePortalAuth deve ser usado dentro de um PortalAuthProvider");
  }
  return context;
}
