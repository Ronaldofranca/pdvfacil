import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Public read queries — uses anon key RLS policies

export function useCatalogoProdutos() {
  return useQuery({
    queryKey: ["catalogo_produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias(nome)")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCatalogoProduto(id: string | null) {
  return useQuery({
    queryKey: ["catalogo_produto", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias(nome)")
        .eq("id", id!)
        .eq("ativo", true)
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

export function useCatalogoTestemunhos() {
  return useQuery({
    queryKey: ["catalogo_testemunhos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testemunhos")
        .select("*, produtos(nome)")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
