import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const cartItemSchema = z.object({
  produto_id: z.string().min(1),
  nome: z.string().min(1).max(200),
  quantidade: z.number().int().min(1),
  preco_original: z.number().min(0),
  preco_vendido: z.number().min(0),
  desconto: z.number().min(0),
  bonus: z.boolean(),
  subtotal: z.number().min(0),
  custo_unitario: z.number().min(0).optional(),
  is_kit: z.boolean().optional(),
  kit_itens: z.array(z.object({ produto_id: z.string().uuid(), quantidade: z.number().min(1) })).optional(),
});

const pagamentoSchema = z.object({
  forma: z.string().min(1).max(50),
  valor: z.number().min(0),
});

const crediarioSchema = z.object({
  entrada: z.number().min(0),
  num_parcelas: z.number().int().min(1).max(48),
  primeiro_vencimento: z.string().min(10),
}).optional();

const vendaInputSchema = z.object({
  empresa_id: z.string().uuid(),
  cliente_id: z.string().uuid().nullable().optional(),
  vendedor_id: z.string().uuid(),
  itens: z.array(cartItemSchema).min(1, "Venda precisa de pelo menos 1 item"),
  pagamentos: z.array(pagamentoSchema).min(1, "Informe pelo menos 1 pagamento"),
  desconto_total: z.number().min(0),
  observacoes: z.string().max(1000).optional(),
  crediario: crediarioSchema,
  idempotency_key: z.string().min(1).optional(),
});

// ─── Types ───
export interface KitItemRef {
  produto_id: string;
  quantidade: number;
}

export interface CartItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_original: number;
  preco_vendido: number;
  desconto: number;
  bonus: boolean;
  subtotal: number;
  custo_unitario?: number;
  is_kit?: boolean;
  kit_itens?: KitItemRef[];
}

export interface Pagamento {
  forma: string;
  valor: number;
}

export interface CrediarioConfig {
  entrada: number;
  num_parcelas: number;
  primeiro_vencimento: string; // YYYY-MM-DD
}

export interface VendaInput {
  empresa_id: string;
  cliente_id?: string | null;
  vendedor_id: string;
  itens: CartItem[];
  pagamentos: Pagamento[];
  desconto_total: number;
  observacoes?: string;
  crediario?: CrediarioConfig;
  idempotency_key?: string;
}

// ─── Idempotency key generator ───
export function generateIdempotencyKey(): string {
  return `venda_${Date.now()}_${crypto.randomUUID()}`;
}

/**
 * Invalidate all dashboard-related queries.
 * Called after any operation that affects financial data.
 */
export function invalidateDashboardQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["dashboard_periodo"] });
  qc.invalidateQueries({ queryKey: ["vendas"] });
  qc.invalidateQueries({ queryKey: ["estoque"] });
  qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
  qc.invalidateQueries({ queryKey: ["parcelas"] });
  qc.invalidateQueries({ queryKey: ["pagamentos"] });
  qc.invalidateQueries({ queryKey: ["financial_ledger"] });
}

// ─── Queries ───
export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*, clientes(nome)")
        .order("data_venda", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useVendaItens(vendaId: string | null) {
  return useQuery({
    queryKey: ["itens_venda", vendaId],
    enabled: !!vendaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_venda")
        .select("*, produtos(imagem_url)")
        .eq("venda_id", vendaId!)
        .order("created_at");
      if (error) throw error;

      // For kit items, fetch kit composition for display
      const kitIds = data?.filter((i: any) => i.kit_id).map((i: any) => i.kit_id) ?? [];
      let kitCompositions = new Map<string, { produto_nome: string; quantidade: number }[]>();
      if (kitIds.length > 0) {
        const { data: kitItens } = await supabase
          .from("kit_itens")
          .select("kit_id, quantidade, produtos(nome)")
          .in("kit_id", kitIds);
        for (const ki of kitItens ?? []) {
          const list = kitCompositions.get(ki.kit_id) ?? [];
          list.push({ produto_nome: (ki as any).produtos?.nome ?? "", quantidade: Number(ki.quantidade) });
          kitCompositions.set(ki.kit_id, list);
        }
      }

      return data?.map((item: any) => ({
        ...item,
        _kit_composicao: item.kit_id ? kitCompositions.get(item.kit_id) ?? [] : [],
      })) ?? [];
    },
  });
}

// ─── Finalizar venda (ATOMIC + IDEMPOTENT via RPC) ───
export function useFinalizarVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (raw: VendaInput) => {
      const v = vendaInputSchema.parse(raw);
      const subtotalBruto = v.itens.reduce((s, i) => s + i.quantidade * i.preco_original, 0);
      const total = v.itens.reduce((s, i) => s + i.subtotal, 0);

      const idempotencyKey = v.idempotency_key || generateIdempotencyKey();

      // Prepare items payload for RPC
      const itensPayload = v.itens.map((i) => {
        const isKit = !!(i as any).is_kit;
        const kitItens = (i as any).kit_itens as KitItemRef[] | undefined;
        let realKitId: string | null = null;
        if (isKit && kitItens?.length) {
          realKitId = i.produto_id.startsWith("kit_") ? i.produto_id.slice(4) : null;
        }
        return {
          produto_id: i.produto_id,
          nome: i.nome,
          quantidade: i.quantidade,
          preco_original: i.preco_original,
          preco_vendido: i.preco_vendido,
          desconto: i.desconto,
          bonus: i.bonus,
          subtotal: i.subtotal,
          custo_unitario: i.custo_unitario ?? 0,
          is_kit: isKit,
          kit_itens: kitItens ?? [],
          real_kit_id: realKitId,
        };
      });

      const hasCrediario = v.pagamentos.some((p) => p.forma === "crediario");

      // Build pagamentos payload — pass as object, NOT JSON.stringify
      const pagamentosPayload = hasCrediario
        ? [{ forma: "crediario", valor: total }]
        : v.pagamentos.filter((p) => p.valor > 0);

      // Use local ISO for data_venda to ensure correct day attribution
      const now = new Date();
      const localISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();

      // Call atomic RPC - everything in a single transaction
      const { data, error } = await supabase.rpc("fn_finalizar_venda_atomica" as any, {
        _idempotency_key: idempotencyKey,
        _empresa_id: v.empresa_id,
        _cliente_id: v.cliente_id || null,
        _vendedor_id: v.vendedor_id,
        _subtotal: subtotalBruto,
        _desconto_total: v.desconto_total,
        _total: total,
        _pagamentos: pagamentosPayload,
        _observacoes: v.observacoes ?? "",
        _data_venda: localISO,
        _itens: itensPayload,
        _crediario: hasCrediario && v.crediario ? v.crediario : null,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.already_processed) {
        console.info("[PDV] Venda já processada (idempotência). ID:", result.id);
      }

      return { id: result.id, already_processed: result.already_processed };
    },
    onSuccess: (data) => {
      // Comprehensive invalidation of all affected queries
      invalidateDashboardQueries(qc);

      if (data?.already_processed) {
        toast.info("Venda já havia sido processada. Nenhuma duplicidade criada.");
      } else {
        toast.success("Venda finalizada com sucesso!");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Pre-check: get parcelas with payments for UI warning
export function useVendaParcelas(vendaId: string | null) {
  return useQuery({
    queryKey: ["venda_parcelas_check", vendaId],
    enabled: !!vendaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas")
        .select("id, status, valor_pago, valor_total")
        .eq("venda_id", vendaId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCancelarVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendaId, motivo, userId }: { vendaId: string; motivo: string; userId: string }) => {
      const { data, error } = await supabase.rpc("fn_cancelar_venda" as any, {
        _venda_id: vendaId,
        _motivo: motivo,
        _usuario_id: userId,
      });
      if (error) throw error;
      return data as { success: boolean; parcelas_canceladas: number; parcelas_com_pagamento: number; valor_ja_pago: number; estornos_estoque: number };
    },
    onSuccess: (data) => {
      // Comprehensive invalidation of all affected queries
      invalidateDashboardQueries(qc);
      
      let msg = "Venda cancelada com sucesso.";
      if (data?.parcelas_canceladas > 0) msg += ` ${data.parcelas_canceladas} parcela(s) cancelada(s).`;
      if (data?.estornos_estoque > 0) msg += ` Estoque estornado (${data.estornos_estoque} movimento(s)).`;
      if (data?.parcelas_com_pagamento > 0) {
        const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.valor_ja_pago);
        msg += ` ⚠️ ${data.parcelas_com_pagamento} parcela(s) tinham pagamentos (${fmt}).`;
      }
      toast.success(msg);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
