import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const produtoSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid(),
  nome: z.string().trim().min(1, "Nome é obrigatório").max(200),
  descricao: z.string().max(2000).optional(),
  codigo: z.string().max(50).optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  preco: z.number().min(0).optional(),
  custo: z.number().min(0).optional(),
  unidade: z.string().max(10).optional(),
  imagem_url: z.string().url().nullable().optional().or(z.literal("")),
  ativo: z.boolean().optional(),
});

// ─── Categorias ───
export function useCategorias() {
  return useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { id?: string; nome: string; descricao?: string; empresa_id: string }) => {
      const { data, error } = cat.id
        ? await supabase.from("categorias").update({ nome: cat.nome, descricao: cat.descricao ?? "", updated_at: new Date().toISOString() }).eq("id", cat.id).select().single()
        : await supabase.from("categorias").insert({ nome: cat.nome, descricao: cat.descricao ?? "", empresa_id: cat.empresa_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categorias"] }); toast.success("Categoria salva!"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Produtos ───
export interface ProdutoInput {
  id?: string;
  empresa_id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  categoria_id?: string | null;
  preco?: number;
  custo?: number;
  unidade?: string;
  imagem_url?: string | null;
  ativo?: boolean;
}

export function useProdutos() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias(nome)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (raw: ProdutoInput) => {
      const p = produtoSchema.parse(raw);
      const payload = {
        nome: p.nome,
        descricao: p.descricao ?? "",
        codigo: p.codigo ?? "",
        categoria_id: p.categoria_id || null,
        preco: p.preco ?? 0,
        custo: p.custo ?? 0,
        unidade: p.unidade ?? "un",
        imagem_url: p.imagem_url ?? null,
        ativo: p.ativo ?? true,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = p.id
        ? await supabase.from("produtos").update(payload).eq("id", p.id).select().single()
        : await supabase.from("produtos").insert({ ...payload, empresa_id: p.empresa_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["produtos"] }); toast.success("Produto salvo!"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["produtos"] }); toast.success("Produto removido!"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Kits ───
export interface KitInput {
  id?: string;
  empresa_id: string;
  nome: string;
  descricao?: string;
  preco?: number;
  imagem_url?: string | null;
  ativo?: boolean;
  itens: { produto_id: string; quantidade: number }[];
}

export function useKits() {
  return useQuery({
    queryKey: ["kits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kits")
        .select("*, kit_itens(*, produtos(nome))")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (k: KitInput) => {
      const kitPayload = {
        nome: k.nome,
        descricao: k.descricao ?? "",
        preco: k.preco ?? 0,
        imagem_url: k.imagem_url ?? null,
        ativo: k.ativo ?? true,
        updated_at: new Date().toISOString(),
      };

      let kitId = k.id;
      if (kitId) {
        const { error } = await supabase.from("kits").update(kitPayload).eq("id", kitId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("kits").insert({ ...kitPayload, empresa_id: k.empresa_id }).select().single();
        if (error) throw error;
        kitId = data.id;
      }

      // Replace kit items
      await supabase.from("kit_itens").delete().eq("kit_id", kitId);
      if (k.itens.length > 0) {
        const { error } = await supabase.from("kit_itens").insert(
          k.itens.map((i) => ({ kit_id: kitId!, produto_id: i.produto_id, quantidade: i.quantidade }))
        );
        if (error) throw error;
      }

      return kitId;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kits"] }); toast.success("Kit salvo!"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kits"] }); toast.success("Kit removido!"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
