import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Config ───
export function useCatalogoConfig() {
  return useQuery({
    queryKey: ["catalogo_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCatalogoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Record<string, any>) => {
      const { data: existing } = await supabase
        .from("catalogo_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("catalogo_config")
          .update({ ...config, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("catalogo_config")
          .insert(config as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogo_config"] });
      toast.success("Configurações salvas!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Public catalog queries (anon-safe) ───
export function useCatalogoProdutos(options?: { destaque?: boolean; promocao?: boolean; lancamento?: boolean; mais_vendido?: boolean }) {
  return useQuery({
    queryKey: ["catalogo_produtos", options],
    queryFn: async () => {
      // Use the secure view that excludes custo column
      let query = (supabase as any)
        .from("produtos_catalogo")
        .select("*, categorias(nome), produto_imagens(id, url, alt, ordem, principal)")
        .order("nome");

      if (options?.destaque) query = query.eq("destaque", true);
      if (options?.promocao) query = query.eq("promocao", true);
      if (options?.lancamento) query = query.eq("lancamento", true);
      if (options?.mais_vendido) query = query.eq("mais_vendido", true);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCatalogoProdutoBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["catalogo_produto_slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      // Use secure view that excludes custo
      const client = supabase as any;

      // Try by slug
      const { data: bySlug } = await client
        .from("produtos_catalogo")
        .select("*, categorias(nome), produto_imagens(id, url, alt, ordem, principal)")
        .eq("slug", slug!)
        .maybeSingle();
      if (bySlug) return bySlug;

      // Fallback to id
      const { data: byId, error } = await client
        .from("produtos_catalogo")
        .select("*, categorias(nome), produto_imagens(id, url, alt, ordem, principal)")
        .eq("id", slug!)
        .maybeSingle();
      if (error) throw error;
      return byId;
    },
  });
}

export function useCatalogoProduto(id: string | null) {
  return useQuery({
    queryKey: ["catalogo_produto", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("produtos_catalogo")
        .select("*, categorias(nome), produto_imagens(id, url, alt, ordem, principal)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCatalogoCategorias() {
  return useQuery({
    queryKey: ["catalogo_categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCatalogoTestemunhos(produtoId?: string) {
  return useQuery({
    queryKey: ["catalogo_testemunhos", produtoId],
    queryFn: async () => {
      let query = supabase
        .from("testemunhos")
        .select("*, produtos(nome)")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      
      if (produtoId) query = query.eq("produto_id", produtoId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ─── Product Images Management ───
export function useProdutoImagens(produtoId: string | null) {
  return useQuery({
    queryKey: ["produto_imagens", produtoId],
    enabled: !!produtoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produto_imagens")
        .select("*")
        .eq("produto_id", produtoId!)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddProdutoImagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (img: { produto_id: string; empresa_id: string; url: string; alt?: string; ordem?: number; principal?: boolean }) => {
      const { error } = await supabase.from("produto_imagens").insert({
        produto_id: img.produto_id,
        empresa_id: img.empresa_id,
        url: img.url,
        alt: img.alt ?? "",
        ordem: img.ordem ?? 0,
        principal: img.principal ?? false,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["produto_imagens", vars.produto_id] });
      toast.success("Imagem adicionada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProdutoImagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, produto_id }: { id: string; produto_id: string }) => {
      const { error } = await supabase.from("produto_imagens").delete().eq("id", id);
      if (error) throw error;
      return produto_id;
    },
    onSuccess: (produto_id) => {
      qc.invalidateQueries({ queryKey: ["produto_imagens", produto_id] });
      toast.success("Imagem removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
