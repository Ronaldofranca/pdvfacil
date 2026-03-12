import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      setRolesLoaded(false);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);

        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("empresa_id", profileData.empresa_id);

        const userRoles = (rolesData?.map((r: any) => r.role) ?? []) as AppRole[];
        setRoles(userRoles);

        if (userRoles.length > 0) {
          const { data: permData } = await supabase
            .from("role_permissoes")
            .select("permissoes(nome)")
            .in("role", userRoles);

          const userPerms = (permData?.map((p: any) => p.permissoes?.nome).filter(Boolean) ?? []) as Permission[];
          setPermissions([...new Set(userPerms)]);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    } finally {
      setRolesLoaded(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchUserData(newSession.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setPermissions([]);
          setRolesLoaded(true);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        await fetchUserData(existingSession.user.id);
      } else {
        setRolesLoaded(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setPermissions([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasPermission = (perm: Permission) => permissions.includes(perm);

  const value: AuthContextType = {
    session,
    user,
    profile,
    roles,
    permissions,
    loading,
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
