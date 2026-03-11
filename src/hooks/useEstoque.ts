import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Estoque ───
export function useEstoque(vendedorId?: string) {
  return useQuery({
    queryKey: ["estoque", vendedorId],
    queryFn: async () => {
      let q = supabase
        .from("estoque")
        .select("*, produtos(nome, codigo, unidade)")
        .order("updated_at", { ascending: false });
      if (vendedorId) q = q.eq("vendedor_id", vendedorId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// ─── Movimentos ───
export function useMovimentos(filters?: { vendedorId?: string; produtoId?: string }) {
  return useQuery({
    queryKey: ["movimentos_estoque", filters],
    queryFn: async () => {
      let q = supabase
        .from("movimentos_estoque")
        .select("*, produtos(nome, codigo)")
        .order("data", { ascending: false })
        .limit(200);
      if (filters?.vendedorId) q = q.eq("vendedor_id", filters.vendedorId);
      if (filters?.produtoId) q = q.eq("produto_id", filters.produtoId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export interface MovimentoInput {
  empresa_id: string;
  produto_id: string;
  vendedor_id: string;
  tipo: "venda" | "reposicao" | "dano" | "ajuste";
  quantidade: number;
  observacoes?: string;
}

export function useAddMovimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: MovimentoInput) => {
      const { data, error } = await supabase
        .from("movimentos_estoque")
        .insert({
          empresa_id: m.empresa_id,
          produto_id: m.produto_id,
          vendedor_id: m.vendedor_id,
          tipo: m.tipo,
          quantidade: m.quantidade,
          observacoes: m.observacoes ?? "",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
      toast.success("Movimento registrado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Vendedores (profiles com role vendedor) ───
export function useVendedores() {
  return useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome, email")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}
