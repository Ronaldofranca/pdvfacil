import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const kitItemSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().min(1),
}).optional();

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

// ─── Finalizar venda ───
export function useFinalizarVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (raw: VendaInput) => {
      const v = vendaInputSchema.parse(raw);
      const subtotalBruto = v.itens.reduce((s, i) => s + i.quantidade * i.preco_original, 0);
      const total = v.itens.reduce((s, i) => s + i.subtotal, 0);

      // Check if crediário payment and needs parcelas
      const hasCrediario = v.pagamentos.some((p) => p.forma === "crediario");
      const crediarioConfig = v.crediario;

      // 1. Criar venda
      const { data: venda, error: vendaErr } = await supabase
        .from("vendas")
        .insert({
          empresa_id: v.empresa_id,
          cliente_id: v.cliente_id || null,
          vendedor_id: v.vendedor_id,
          status: "finalizada" as any,
          subtotal: subtotalBruto,
          desconto_total: v.desconto_total,
          total,
          pagamentos: v.pagamentos as any,
          observacoes: v.observacoes ?? "",
        })
        .select()
        .single();
      if (vendaErr) throw vendaErr;

      // 2. Inserir itens
      const itensPayload = v.itens.map((i) => {
        const isKit = !!(i as any).is_kit;
        const kitItens = (i as any).kit_itens as KitItemRef[] | undefined;
        // For kits: use first component product_id for FK, store real kit_id separately
        let produtoIdForDb = i.produto_id;
        let kitIdForDb: string | null = null;
        if (isKit && kitItens?.length) {
          produtoIdForDb = kitItens[0].produto_id;
          // Extract real kit UUID from "kit_<uuid>" format
          kitIdForDb = i.produto_id.startsWith("kit_") ? i.produto_id.slice(4) : null;
        }
        return {
          venda_id: venda.id,
          produto_id: produtoIdForDb,
          kit_id: kitIdForDb,
          item_type: isKit ? "kit" : "produto",
          nome_produto: i.nome,
          quantidade: i.quantidade,
          preco_original: i.preco_original,
          preco_vendido: i.preco_vendido,
          desconto: i.desconto,
          bonus: i.bonus,
          subtotal: i.subtotal,
          custo_unitario: i.custo_unitario ?? 0,
        };
      });
      const { error: itensErr } = await supabase.from("itens_venda").insert(itensPayload);
      if (itensErr) throw itensErr;

      // 3. Registrar movimentos de estoque (saída)
      // For kits: decompose into component products for stock
      const movimentos: {
        empresa_id: string;
        produto_id: string;
        vendedor_id: string;
        tipo: "venda";
        quantidade: number;
        observacoes: string;
        kit_id?: string | null;
      }[] = [];

      for (const i of v.itens) {
        if (i.quantidade <= 0) continue;
        const isKit = !!(i as any).is_kit;
        const kitItens = (i as any).kit_itens as KitItemRef[] | undefined;
        if (isKit && kitItens?.length) {
          const realKitId = i.produto_id.startsWith("kit_") ? i.produto_id.slice(4) : null;
          // Kit: create movements for each component product
          for (const ki of kitItens) {
            movimentos.push({
              empresa_id: v.empresa_id,
              produto_id: ki.produto_id,
              vendedor_id: v.vendedor_id,
              tipo: "venda" as any,
              quantidade: ki.quantidade * i.quantidade,
              observacoes: `Venda #${venda.id.slice(0, 8)} (Kit: ${i.nome})`,
              kit_id: realKitId,
            });
          }
        } else {
          movimentos.push({
            empresa_id: v.empresa_id,
            produto_id: i.produto_id,
            vendedor_id: v.vendedor_id,
            tipo: "venda" as any,
            quantidade: i.quantidade,
            observacoes: `Venda #${venda.id.slice(0, 8)}`,
          });
        }
      }

      if (movimentos.length > 0) {
        await supabase.from("movimentos_estoque").insert(movimentos);
      }

      // 4. Gerar parcelas automaticamente se crediário
      if (hasCrediario && crediarioConfig && crediarioConfig.num_parcelas > 0) {
        const entrada = crediarioConfig.entrada || 0;
        const valorRestante = total - entrada;

        if (valorRestante > 0) {
          const valorParcela = Math.floor((valorRestante / crediarioConfig.num_parcelas) * 100) / 100;
          const resto = Math.round((valorRestante - valorParcela * crediarioConfig.num_parcelas) * 100) / 100;

          const parcelas = [];
          const baseDate = new Date(crediarioConfig.primeiro_vencimento + "T12:00:00");

          for (let i = 0; i < crediarioConfig.num_parcelas; i++) {
            const venc = new Date(baseDate);
            venc.setMonth(venc.getMonth() + i);
            const valor = i === 0 ? valorParcela + resto : valorParcela;

            parcelas.push({
              empresa_id: v.empresa_id,
              venda_id: venda.id,
              cliente_id: v.cliente_id || null,
              numero: i + 1,
              valor_total: valor,
              valor_pago: 0,
              vencimento: venc.toISOString().split("T")[0],
              forma_pagamento: "crediario",
            });
          }

          const { error: parcelasErr } = await supabase.from("parcelas").insert(parcelas);
          if (parcelasErr) throw parcelasErr;
        }

        // Se houve entrada, registrar como pagamento da primeira parcela ou pagamento avulso
        // A entrada já está contabilizada no pagamento da venda
      }

      return venda;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
      qc.invalidateQueries({ queryKey: ["parcelas"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Venda finalizada com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelarVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendaId, motivo, userId }: { vendaId: string; motivo: string; userId: string }) => {
      // 1. Cancel the venda with tracking fields
      const { error } = await supabase
        .from("vendas")
        .update({
          status: "cancelada" as any,
          motivo_cancelamento: motivo,
          cancelado_por: userId,
          cancelado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", vendaId);
      if (error) throw error;

      // 2. Cancel unpaid parcelas linked to this venda
      const { data: parcelas } = await supabase
        .from("parcelas")
        .select("id, status, valor_pago")
        .eq("venda_id", vendaId);

      if (parcelas && parcelas.length > 0) {
        const unpaidIds = parcelas
          .filter((p) => p.status !== "paga" && Number(p.valor_pago) === 0)
          .map((p) => p.id);

        if (unpaidIds.length > 0) {
          await supabase
            .from("parcelas")
            .update({
              status: "cancelada" as any,
              observacoes: `Cancelada por cancelamento da venda #${vendaId.slice(0, 8)}`,
              updated_at: new Date().toISOString(),
            } as any)
            .in("id", unpaidIds);
        }
      }

      // 3. Generate estorno stock movements
      const { data: itens } = await supabase
        .from("itens_venda")
        .select("produto_id, quantidade, kit_id, nome_produto, item_type")
        .eq("venda_id", vendaId);

      if (itens && itens.length > 0) {
        // Get empresa_id from the venda
        const { data: venda } = await supabase
          .from("vendas")
          .select("empresa_id, vendedor_id")
          .eq("id", vendaId)
          .single();

        if (venda) {
          const estornoMovimentos = itens
            .filter((i) => i.item_type !== "kit") // kit components handled separately
            .map((i) => ({
              empresa_id: venda.empresa_id,
              produto_id: i.produto_id,
              vendedor_id: venda.vendedor_id,
              tipo: "ajuste" as any,
              quantidade: Number(i.quantidade),
              observacoes: `Estorno - Cancelamento venda #${vendaId.slice(0, 8)} (${i.nome_produto})`,
            }));

          if (estornoMovimentos.length > 0) {
            await supabase.from("movimentos_estoque").insert(estornoMovimentos);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["parcelas"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Venda cancelada com sucesso. Parcelas e estoque estornados.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
