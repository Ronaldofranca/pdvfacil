import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Permission } from "@/types/auth";

interface Profile {
  id: string;
  user_id: string;
  empresa_id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  avatar_url: string | null;
  ativo: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: Permission[];
  loading: boolean;
  rolesLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  isGerente: boolean;
  isVendedor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_INIT_TIMEOUT_MS = 10000;
const USER_DATA_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const fetchSeqRef = useRef(0);
  const loadedUserIdRef = useRef<string | null>(null);

  const resetUserData = () => {
    setProfile(null);
    setRoles([]);
    setPermissions([]);
    setRolesLoaded(true);
  };

  const fetchUserData = async (userId: string, seq: number) => {
    setRolesLoaded(false);

    const fallbackTimer = window.setTimeout(() => {
      if (seq === fetchSeqRef.current) {
        console.warn("Timeout ao carregar profile/roles; liberando app com dados mínimos");
        setRolesLoaded(true);
      }
    }, USER_DATA_TIMEOUT_MS);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (seq !== fetchSeqRef.current) return;
      if (profileError) throw profileError;

      if (!profileData) {
        resetUserData();
        return;
      }

      setProfile(profileData as Profile);

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("empresa_id", profileData.empresa_id);

      if (seq !== fetchSeqRef.current) return;
      if (rolesError) throw rolesError;

      const userRoles = (rolesData?.map((r: any) => r.role) ?? []) as AppRole[];
      setRoles(userRoles);

      if (userRoles.length === 0) {
        setPermissions([]);
        return;
      }

      try {
        const { data: permData, error: permError } = await supabase
          .from("role_permissoes")
          .select("permissoes(nome)")
          .in("role", userRoles)
          .eq("empresa_id", profileData.empresa_id);

        if (seq !== fetchSeqRef.current) return;
        if (permError) throw permError;

        const userPerms = (permData?.map((p: any) => p.permissoes?.nome).filter(Boolean) ?? []) as Permission[];
        setPermissions([...new Set(userPerms)]);
      } catch (permError) {
        if (seq !== fetchSeqRef.current) return;
        console.error("Erro ao carregar permissões do usuário:", permError);
        setPermissions([]);
      }
    } catch (error) {
      if (seq !== fetchSeqRef.current) return;
      console.error("Erro ao carregar dados do usuário:", error);
      setRoles([]);
      setPermissions([]);
    } finally {
      window.clearTimeout(fallbackTimer);
      if (seq === fetchSeqRef.current) {
        setRolesLoaded(true);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const applySession = (nextSession: Session | null, options?: { refreshUserData?: boolean }) => {
      if (!mounted) return;

      const nextUserId = nextSession?.user?.id ?? null;
      const userChanged = loadedUserIdRef.current !== nextUserId;

      // Only update session/user state if they actually changed to avoid unnecessary re-renders
      setSession((prev) => {
        if (prev?.access_token === nextSession?.access_token) return prev;
        return nextSession;
      });
      setUser((prev) => {
        if (prev?.id === nextSession?.user?.id) return prev;
        return nextSession?.user ?? null;
      });

      if (!nextUserId) {
        loadedUserIdRef.current = null;
        fetchSeqRef.current += 1;
        resetUserData();
        return;
      }

      // Only fetch user data if user actually changed (not on token refresh)
      if (userChanged) {
        loadedUserIdRef.current = nextUserId;
        const seq = ++fetchSeqRef.current;
        void fetchUserData(nextUserId, seq);
        return;
      }

      // User is the same — data already loaded, don't reset rolesLoaded
      if (!rolesLoadedRef.current && options?.refreshUserData) {
        // First load hasn't finished yet, let it continue
        return;
      }

      // Ensure rolesLoaded stays true (no flicker)
      setRolesLoaded(true);
    };

    const bootstrapAuth = async () => {
      const initTimer = window.setTimeout(() => {
        if (!mounted) return;
        console.warn("Timeout na inicialização de autenticação; liberando tela");
        setLoading(false);
        setRolesLoaded(true);
      }, AUTH_INIT_TIMEOUT_MS);

      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        applySession(existingSession, { refreshUserData: true });
      } catch (error) {
        console.error("Falha ao restaurar sessão:", error);
        fetchSeqRef.current += 1;
        loadedUserIdRef.current = null;
        resetUserData();
      } finally {
        window.clearTimeout(initTimer);
        if (mounted) {
          setLoading(false);
        }
      }

      const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
        const shouldRefreshUserData = event === "SIGNED_IN" || event === "USER_UPDATED";
        applySession(newSession, { refreshUserData: shouldRefreshUserData });
      });

      subscription = data.subscription;
    };

    void bootstrapAuth();

    return () => {
      mounted = false;
      fetchSeqRef.current += 1;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    fetchSeqRef.current += 1;
    loadedUserIdRef.current = null;
    setSession(null);
    setUser(null);
    resetUserData();
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasPermission = (perm: Permission) => permissions.includes(perm);

  const value: AuthContextType = {
    session,
    user,
    profile,
    roles,
    permissions,
    loading: loading || (session ? !rolesLoaded : false),
    rolesLoaded,
    signIn,
    signOut,
    hasRole,
    hasPermission,
    isAdmin: hasRole("admin"),
    isGerente: hasRole("gerente"),
    isVendedor: hasRole("vendedor"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
