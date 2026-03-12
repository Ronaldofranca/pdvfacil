import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NivelRecompensa {
  id: string;
  empresa_id: string;
  nome: string;
  pontos_minimos: number;
  cor: string;
  icone: string;
  beneficios: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useNiveisRecompensa() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["niveis_recompensa", profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("niveis_recompensa")
        .select("*")
        .eq("empresa_id", profile!.empresa_id)
        .eq("ativo", true)
        .order("pontos_minimos", { ascending: true });
      if (error) throw error;
      return data as NivelRecompensa[];
    },
  });
}

export function useAllNiveisRecompensa() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["niveis_recompensa_all", profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("niveis_recompensa")
        .select("*")
        .eq("empresa_id", profile!.empresa_id)
        .order("pontos_minimos", { ascending: true });
      if (error) throw error;
      return data as NivelRecompensa[];
    },
  });
}

export function useAddNivelRecompensa() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (params: { nome: string; pontos_minimos: number; cor: string; icone: string; beneficios: string }) => {
      if (!profile?.empresa_id) throw new Error("Sessão sem empresa vinculada.");
      const { error } = await (supabase as any)
        .from("niveis_recompensa")
        .insert({ ...params, empresa_id: profile.empresa_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["niveis_recompensa"] });
      qc.invalidateQueries({ queryKey: ["niveis_recompensa_all"] });
      toast.success("Nível de recompensa criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateNivelRecompensa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...params }: Partial<NivelRecompensa> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("niveis_recompensa")
        .update({ ...params, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["niveis_recompensa"] });
      qc.invalidateQueries({ queryKey: ["niveis_recompensa_all"] });
      toast.success("Nível atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteNivelRecompensa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("niveis_recompensa")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["niveis_recompensa"] });
      qc.invalidateQueries({ queryKey: ["niveis_recompensa_all"] });
      toast.success("Nível removido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Returns the current level for a given point total */
export function getNivelAtual(pontos: number, niveis: NivelRecompensa[]): NivelRecompensa | null {
  if (!niveis?.length) return null;
  const sorted = [...niveis].sort((a, b) => b.pontos_minimos - a.pontos_minimos);
  return sorted.find((n) => pontos >= n.pontos_minimos) ?? null;
}

/** Returns the next level */
export function getProximoNivel(pontos: number, niveis: NivelRecompensa[]): NivelRecompensa | null {
  if (!niveis?.length) return null;
  const sorted = [...niveis].sort((a, b) => a.pontos_minimos - b.pontos_minimos);
  return sorted.find((n) => n.pontos_minimos > pontos) ?? null;
}
