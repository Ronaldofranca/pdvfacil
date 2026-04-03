import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CartItem } from "./useVendas";

export type StatusPedido = "rascunho" | "aguardando_entrega" | "em_rota" | "entregue" | "cancelado" | "convertido_em_venda";

export interface Pedido {
  id: string;
  empresa_id: string;
  cliente_id: string;
  vendedor_id: string;
  data_pedido: string;
  data_prevista_entrega: string;
  horario_entrega: string;
  status: StatusPedido;
  subtotal: number;
  desconto_total: number;
  valor_total: number;
  observacoes: string;
  venda_id: string | null;
  entregue_em: string | null;
  em_rota_em: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string; telefone: string; cidade: string; bairro: string; estado: string; latitude: number | null; longitude: number | null; rua: string; cep: string };
}

export interface ItemPedido {
  id: string;
  empresa_id: string;
  pedido_id: string;
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_original: number;
  preco_pedido: number;
  desconto: number;
  bonus: boolean;
  subtotal: number;
  created_at: string;
  updated_at: string;
  produtos?: {
    custo: number | null;
    imagem_url: string | null;
  } | null;
}

export interface PedidoInput {
  empresa_id: string;
  cliente_id: string;
  vendedor_id: string;
  data_prevista_entrega: string;
  horario_entrega?: string;
  itens: CartItem[];
  desconto: number;
  observacoes?: string;
}

// ─── Queries ───
export function usePedidos(filtros?: { status?: StatusPedido; cliente_id?: string; data_inicio?: string; data_fim?: string }) {
  return useQuery({
    queryKey: ["pedidos", filtros],
    queryFn: async () => {
      let q = (supabase as any)
        .from("pedidos")
        .select("*, clientes(nome, telefone, cidade, bairro, estado, latitude, longitude, rua, cep)")
        .order("data_prevista_entrega", { ascending: true });
      if (filtros?.status) q = q.eq("status", filtros.status);
      if (filtros?.cliente_id) q = q.eq("cliente_id", filtros.cliente_id);
      if (filtros?.data_inicio) q = q.gte("data_prevista_entrega", filtros.data_inicio);
      if (filtros?.data_fim) q = q.lte("data_prevista_entrega", filtros.data_fim);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data as Pedido[];
    },
    enabled: filtros?.cliente_id !== undefined ? !!filtros.cliente_id : true,
  });
}

export function usePedidoItens(pedidoId: string | null) {
  return useQuery({
    queryKey: ["itens_pedido", pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("itens_pedido")
        .select("*, produtos(custo, imagem_url)")
        .eq("pedido_id", pedidoId!)
        .order("created_at");
      if (error) throw error;
      return data as ItemPedido[];
    },
  });
}

export function usePedidosPendentesCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ["pedidos_cliente", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pedidos")
        .select("*")
        .eq("cliente_id", clienteId!)
        .in("status", ["rascunho", "aguardando_entrega", "em_rota"])
        .order("data_prevista_entrega");
      if (error) throw error;
      return data as Pedido[];
    },
  });
}

export function usePedidosDashboard() {
  const hoje = new Date().toISOString().split("T")[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  return useQuery({
    queryKey: ["pedidos_dashboard", hoje],
    queryFn: async () => {
      const { data: todos, error } = await (supabase as any)
        .from("pedidos")
        .select("id, status, data_prevista_entrega, valor_total")
        .in("status", ["rascunho", "aguardando_entrega", "em_rota"]);
      if (error) throw error;
      const pedidos = (todos ?? []) as { id: string; status: string; data_prevista_entrega: string; valor_total: number }[];
      const paraHoje = pedidos.filter((p) => p.data_prevista_entrega === hoje);
      const atrasados = pedidos.filter((p) => p.data_prevista_entrega < hoje);
      const valorPendente = pedidos.reduce((s, p) => s + Number(p.valor_total), 0);
      return {
        totalPendentes: pedidos.length,
        paraHoje: paraHoje.length,
        atrasados: atrasados.length,
        valorPendente,
      };
    },
    refetchInterval: 60000,
  });
}

// ─── Mutations ───
export function useCriarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PedidoInput) => {
      const subtotalBruto = input.itens.reduce((s, i) => s + i.quantidade * i.preco_original, 0);
      const total = input.itens.reduce((s, i) => s + i.subtotal, 0);

      const { data: pedido, error: pedidoErr } = await (supabase as any)
        .from("pedidos")
        .insert({
          empresa_id: input.empresa_id,
          cliente_id: input.cliente_id,
          vendedor_id: input.vendedor_id,
          data_prevista_entrega: input.data_prevista_entrega,
          horario_entrega: input.horario_entrega ?? "",
          status: "rascunho",
          subtotal: subtotalBruto,
          desconto_total: input.desconto,
          valor_total: total,
          observacoes: input.observacoes ?? "",
        })
        .select()
        .single();
      if (pedidoErr) throw pedidoErr;

      const itensPayload = input.itens.map((i) => ({
        pedido_id: pedido.id,
        empresa_id: input.empresa_id,
        produto_id: i.produto_id,
        nome_produto: i.nome,
        quantidade: i.quantidade,
        preco_original: i.preco_original,
        preco_pedido: i.preco_vendido,
        desconto: i.desconto,
        bonus: i.bonus,
        subtotal: i.subtotal,
      }));
      const { error: itensErr } = await (supabase as any).from("itens_pedido").insert(itensPayload);
      if (itensErr) throw itensErr;

      return pedido;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos_dashboard"] });
      toast.success("Pedido criado com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAtualizarStatusPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, venda_id }: { id: string; status: StatusPedido; venda_id?: string }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (venda_id) updateData.venda_id = venda_id;
      const { error } = await (supabase as any)
        .from("pedidos")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos_dashboard"] });
      qc.invalidateQueries({ queryKey: ["pedidos_cliente"] });
      const msgs: Record<string, string> = {
        aguardando_entrega: "Pedido confirmado!",
        em_rota: "Pedido em rota!",
        entregue: "Pedido marcado como entregue!",
        cancelado: "Pedido cancelado.",
        convertido_em_venda: "Pedido convertido em venda!",
      };
      toast.success(msgs[status] ?? "Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pedidos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos_dashboard"] });
      toast.success("Pedido excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAtualizarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PedidoInput }) => {
      const subtotalBruto = input.itens.reduce((s, i) => s + i.quantidade * i.preco_original, 0);
      const total = input.itens.reduce((s, i) => s + i.subtotal, 0);

      // 1. Atualiza mestre do pedido
      const { error: pedidoErr } = await (supabase as any)
        .from("pedidos")
        .update({
          cliente_id: input.cliente_id,
          vendedor_id: input.vendedor_id,
          data_prevista_entrega: input.data_prevista_entrega,
          horario_entrega: input.horario_entrega ?? "",
          subtotal: subtotalBruto,
          desconto_total: input.desconto,
          valor_total: total,
          observacoes: input.observacoes ?? "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (pedidoErr) throw pedidoErr;

      // 2. Remove itens antigos
      const { error: delErr } = await (supabase as any)
        .from("itens_pedido")
        .delete()
        .eq("pedido_id", id);
      if (delErr) throw delErr;

      // 3. Insere itens novos
      const itensPayload = input.itens.map((i) => ({
        pedido_id: id,
        empresa_id: input.empresa_id,
        produto_id: i.produto_id,
        nome_produto: i.nome,
        quantidade: i.quantidade,
        preco_original: i.preco_original,
        preco_pedido: i.preco_vendido,
        desconto: i.desconto,
        bonus: i.bonus,
        subtotal: i.subtotal,
      }));
      const { error: itensErr } = await (supabase as any).from("itens_pedido").insert(itensPayload);
      if (itensErr) throw itensErr;

      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedidos_dashboard"] });
      qc.invalidateQueries({ queryKey: ["itens_pedido"] });
      toast.success("Pedido atualizado com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
