import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: {
      id: string;
      nome?: string;
      cnpj?: string;
      razao_social?: string;
      telefone?: string;
      email?: string;
      endereco?: string;
      logo_url?: string | null;
    }) => {
      const { id, ...payload } = e;
      const { data, error } = await supabase
        .from("empresas")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresas"] });
      toast.success("Empresa atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
