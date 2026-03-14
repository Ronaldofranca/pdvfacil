import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const clienteSchema = z.object({
  id: z.string().uuid().optional(),
  empresa_id: z.string().uuid(),
  nome: z.string().trim().min(1, "Nome é obrigatório").max(200),
  telefone: z.string().max(30).optional(),
  email: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  cpf_cnpj: z.string().max(20).optional(),
  tipo: z.enum(["pf", "pj"]).optional(),
  cidade: z.string().max(100).optional(),
  rua: z.string().max(200).optional(),
  bairro: z.string().max(120).optional(),
  estado: z.string().max(2).optional(),
  uf: z.string().max(2).optional(),
  cep: z.string().max(10).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  observacoes: z.string().max(1000).optional(),
  ativo: z.boolean().optional(),
});

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
  bairro?: string;
  estado?: string;
  uf?: string;
  cep?: string;
  latitude?: number | null;
  longitude?: number | null;
  observacoes?: string;
  ativo?: boolean;
  permitir_fiado?: boolean;
  cliente_indicador_id?: string | null;
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
    mutationFn: async (raw: ClienteInput) => {
      const c = clienteSchema.parse(raw);
      const payload: Record<string, any> = {
        nome: c.nome,
        telefone: c.telefone ?? "",
        email: c.email ?? "",
        cpf_cnpj: c.cpf_cnpj ?? "",
        tipo: c.tipo ?? "pf",
        cidade: c.cidade ?? "",
        rua: c.rua ?? "",
        bairro: c.bairro ?? "",
        estado: (c.uf ?? c.estado ?? "").toUpperCase(),
        uf: (c.uf ?? c.estado ?? "").toUpperCase(),
        cep: c.cep ?? "",
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        observacoes: c.observacoes ?? "",
        ativo: c.ativo ?? true,
        updated_at: new Date().toISOString(),
      };
      if ((raw as any).cliente_indicador_id !== undefined) {
        payload.cliente_indicador_id = (raw as any).cliente_indicador_id || null;
      }
      const { data, error } = c.id
        ? await (supabase as any).from("clientes").update(payload).eq("id", c.id).select().single()
        : await (supabase as any).from("clientes").insert({ ...payload, empresa_id: c.empresa_id }).select().single();
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
