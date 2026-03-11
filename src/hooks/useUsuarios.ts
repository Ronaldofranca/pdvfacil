import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
