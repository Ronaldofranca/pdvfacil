import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Todos os profiles do sistema com seus roles */
export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

/** Apenas Admins e Gerentes (usuários com controle total / gerencial) */
export function useAdmins() {
  return useQuery({
    queryKey: ["usuarios", "admins"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*, user_roles(role)")
        .order("nome");
      if (error) throw error;
      const rows: any[] = data ?? [];
      return rows.filter((p) =>
        p.user_roles?.some((r: any) => r.role === "admin" || r.role === "gerente")
      );
    },
  });
}

/** Apenas Vendedores */
export function useVendedores() {
  return useQuery({
    queryKey: ["usuarios", "vendedores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*, user_roles(role)")
        .order("nome");
      if (error) throw error;
      const rows: any[] = data ?? [];
      return rows.filter((p) =>
        p.user_roles?.some((r: any) => r.role === "vendedor")
      );
    },
  });
}

/**
 * Clientes do sistema (tabela `clientes`).
 * has_portal_access = true quando user_id está preenchido (cliente tem login no portal).
 */
export function useClientesPortal() {
  return useQuery({
    queryKey: ["usuarios", "clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, email, telefone, cidade, ativo, user_id, cpf_cnpj, created_at")
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        ...c,
        has_portal_access: !!c.user_id,
      }));
    },
  });
}

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (u: { id: string; nome?: string; telefone?: string; cargo?: string; ativo?: boolean }) => {
      const { id, ...payload } = u;
      const { error } = await supabase
        .from("profiles")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; empresa_id: string; role: string; old_role?: string }) => {
      // Remove old role if exists
      if (input.old_role) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", input.user_id)
          .eq("empresa_id", input.empresa_id)
          .eq("role", input.old_role as any);
      }
      // Insert new role
      const { error } = await supabase.from("user_roles").insert({
        user_id: input.user_id,
        empresa_id: input.empresa_id,
        role: input.role as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Permissão atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
