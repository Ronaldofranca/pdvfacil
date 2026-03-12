import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useConfiguracoes() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["configuracoes", profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("configuracoes")
        .select("*")
        .eq("empresa_id", profile!.empresa_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertConfiguracoes() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const empresa_id = profile!.empresa_id;
      const { data: existing } = await (supabase as any)
        .from("configuracoes")
        .select("id")
        .eq("empresa_id", empresa_id)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("configuracoes")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("configuracoes")
          .insert({ ...values, empresa_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["configuracoes"] });
      toast.success("Configurações salvas!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFormasPagamento() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["formas_pagamento", profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("formas_pagamento")
        .select("*")
        .eq("empresa_id", profile!.empresa_id)
        .order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; ativa: boolean; empresa_id: string }[];
    },
  });
}

export function useAddFormaPagamento() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await (supabase as any)
        .from("formas_pagamento")
        .insert({ empresa_id: profile!.empresa_id, nome });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formas_pagamento"] });
      toast.success("Forma de pagamento adicionada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleFormaPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await (supabase as any)
        .from("formas_pagamento")
        .update({ ativa })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["formas_pagamento"] }),
  });
}

export function useDeleteFormaPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("formas_pagamento")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formas_pagamento"] });
      toast.success("Forma de pagamento removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCidadesAtendidas() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["cidades_atendidas", profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cidades_atendidas")
        .select("*")
        .eq("empresa_id", profile!.empresa_id)
        .order("cidade");
      if (error) throw error;
      return data as { id: string; cidade: string; estado: string; ativa: boolean; empresa_id: string }[];
    },
  });
}

export function useAddCidade() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ cidade, estado }: { cidade: string; estado: string }) => {
      const { error } = await (supabase as any)
        .from("cidades_atendidas")
        .insert({ empresa_id: profile!.empresa_id, cidade, estado });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cidades_atendidas"] });
      toast.success("Cidade adicionada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("cidades_atendidas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cidades_atendidas"] });
      toast.success("Cidade removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
