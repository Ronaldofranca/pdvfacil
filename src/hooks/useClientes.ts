import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClienteInput {
  id?: string;
  empresa_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  tipo?: "pf" | "pj";
  cidade?: string;
  rua?: string;
  estado?: string;
  cep?: string;
  latitude?: number | null;
  longitude?: number | null;
  observacoes?: string;
  ativo?: boolean;
}

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCliente(id: string | null) {
  return useQuery({
    queryKey: ["clientes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: ClienteInput) => {
      const payload = {
        nome: c.nome,
        telefone: c.telefone ?? "",
        email: c.email ?? "",
        cpf_cnpj: c.cpf_cnpj ?? "",
        tipo: c.tipo ?? "pf",
        cidade: c.cidade ?? "",
        rua: c.rua ?? "",
        estado: c.estado ?? "",
        cep: c.cep ?? "",
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        observacoes: c.observacoes ?? "",
        ativo: c.ativo ?? true,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = c.id
        ? await supabase.from("clientes").update(payload).eq("id", c.id).select().single()
        : await supabase.from("clientes").insert({ ...payload, empresa_id: c.empresa_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente salvo!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente removido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Histórico de Compras ───
export function useHistoricoCompras(clienteId: string | null) {
  return useQuery({
    queryKey: ["historico_compras", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_compras")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("data_compra", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export interface HistoricoInput {
  empresa_id: string;
  cliente_id: string;
  usuario_id: string;
  descricao: string;
  valor: number;
  data_compra?: string;
  produtos?: any[];
  observacoes?: string;
}

export function useAddHistorico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: HistoricoInput) => {
      const { data, error } = await supabase
        .from("historico_compras")
        .insert({
          empresa_id: h.empresa_id,
          cliente_id: h.cliente_id,
          usuario_id: h.usuario_id,
          descricao: h.descricao,
          valor: h.valor,
          data_compra: h.data_compra ?? new Date().toISOString(),
          produtos: h.produtos ?? [],
          observacoes: h.observacoes ?? "",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["historico_compras", vars.cliente_id] });
      toast.success("Registro adicionado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
