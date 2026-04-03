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
      
      const { data: pixData } = await (supabase as any)
        .rpc("get_pix_config", { _empresa_id: profile!.empresa_id });
        
      if (data && pixData && pixData.length > 0) {
        return { ...data, ...pixData[0] };
      }
      return data;
    },
  });
}

export function useUpsertConfiguracoes() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (!profile?.empresa_id) throw new Error("Sessão sem empresa vinculada.");

      const empresa_id = profile.empresa_id;
      
      // Separate PIX fields
      const pixKeys = ['pix_chave', 'pix_tipo', 'pix_nome_recebedor', 'pix_cidade_recebedor'];
      const hasPixKeys = Object.keys(values).some(k => pixKeys.includes(k));
      if (hasPixKeys) {
        await (supabase as any).rpc("upsert_pix_config", {
          _empresa_id: empresa_id,
          _pix_chave: values.pix_chave,
          _pix_tipo: values.pix_tipo,
          _pix_nome_recebedor: values.pix_nome_recebedor,
          _pix_cidade_recebedor: values.pix_cidade_recebedor
        });
        
        // Remove pix fields before updating main configuracoes table
        pixKeys.forEach(k => delete values[k]);
      }
      
      // If no other fields to update, return early
      if (Object.keys(values).length === 0) return;

      const { data: existing, error: existingError } = await (supabase as any)
        .from("configuracoes")
        .select("id")
        .eq("empresa_id", empresa_id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { data: updated, error } = await (supabase as any)
          .from("configuracoes")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!updated) throw new Error("Sem permissão para atualizar estas configurações.");
      } else {
        const { data: inserted, error } = await (supabase as any)
          .from("configuracoes")
          .insert({ ...values, empresa_id })
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!inserted) throw new Error("Sem permissão para criar configurações da empresa.");
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
      if (!profile?.empresa_id) throw new Error("Sessão sem empresa vinculada.");

      const { data: inserted, error } = await (supabase as any)
        .from("formas_pagamento")
        .insert({ empresa_id: profile.empresa_id, nome })
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!inserted) throw new Error("Sem permissão para adicionar forma de pagamento.");
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
      const { data: updated, error } = await (supabase as any)
        .from("formas_pagamento")
        .update({ ativa })
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("Sem permissão para alterar forma de pagamento.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["formas_pagamento"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteFormaPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: removed, error } = await (supabase as any)
        .from("formas_pagamento")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!removed) throw new Error("Sem permissão para remover forma de pagamento.");
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
        .select(`
          *,
          representantes (
            nome,
            cor,
            telefone
          )
        `)
        .eq("empresa_id", profile!.empresa_id)
        .order("cidade");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddCidade() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ cidade, estado, representante_id, latitude, longitude }: { 
      cidade: string; 
      estado: string; 
      representante_id?: string | null;
      latitude?: string | number | null;
      longitude?: string | number | null;
    }) => {
      if (!profile?.empresa_id) throw new Error("Sessão sem empresa vinculada.");

      const { data: inserted, error } = await (supabase as any)
        .from("cidades_atendidas")
        .insert({ 
          empresa_id: profile.empresa_id, 
          cidade, 
          estado,
          representante_id: representante_id === "nenhum" ? null : representante_id,
          latitude,
          longitude
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!inserted) throw new Error("Sem permissão para adicionar cidade.");
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
      const { data: removed, error } = await (supabase as any)
        .from("cidades_atendidas")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!removed) throw new Error("Sem permissão para remover cidade.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cidades_atendidas"] });
      toast.success("Cidade removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddCidadesMassa() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (cidades: any[]) => {
      if (!profile?.empresa_id) throw new Error("Sessão sem empresa vinculada.");
      
      const cidadesComEmpresa = cidades.map(c => ({
        ...c,
        empresa_id: profile.empresa_id
      }));

      const { data, error } = await (supabase as any)
        .from("cidades_atendidas")
        .insert(cidadesComEmpresa)
        .select("id");

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cidades_atendidas"] });
      toast.success("Cidades cadastradas com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao salvar cidades: ${e.message}`),
  });
}

export function useUpdateCidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data: updated, error } = await (supabase as any)
        .from("cidades_atendidas")
        .update(values)
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("Sem permissão para atualizar cidade.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cidades_atendidas"] });
      toast.success("Cidade atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ==========================================
// REPRESENTANTES
// ==========================================

export function useRepresentantes() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["representantes", profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("representantes")
        .select("*")
        .eq("empresa_id", profile!.empresa_id)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddRepresentante() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (representante: { nome: string; telefone?: string; cor?: string; email?: string }) => {
      if (!profile?.empresa_id) throw new Error("Sessão sem empresa vinculada.");

      const { data: inserted, error } = await (supabase as any)
        .from("representantes")
        .insert({ 
          empresa_id: profile.empresa_id, 
          ...representante 
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!inserted) throw new Error("Sem permissão para adicionar representante.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["representantes"] });
      toast.success("Representante adicionado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRepresentante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data: updated, error } = await (supabase as any)
        .from("representantes")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("Sem permissão para atualizar representante.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["representantes"] });
      qc.invalidateQueries({ queryKey: ["cidades_atendidas"] }); // Podem existir cidades ligadas a ele que precisam de atualização de view
      toast.success("Representante atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRepresentante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: removed, error } = await (supabase as any)
        .from("representantes")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!removed) throw new Error("Sem permissão para remover representante.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["representantes"] });
      qc.invalidateQueries({ queryKey: ["cidades_atendidas"] });
      toast.success("Representante removido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
