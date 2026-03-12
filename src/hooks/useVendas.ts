import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const cartItemSchema = z.object({
  produto_id: z.string().uuid(),
  nome: z.string().min(1).max(200),
  quantidade: z.number().int().min(1),
  preco_original: z.number().min(0),
  preco_vendido: z.number().min(0),
  desconto: z.number().min(0),
  bonus: z.boolean(),
  subtotal: z.number().min(0),
});

const pagamentoSchema = z.object({
  forma: z.string().min(1).max(50),
  valor: z.number().min(0),
});

const vendaInputSchema = z.object({
  empresa_id: z.string().uuid(),
  cliente_id: z.string().uuid().nullable().optional(),
  vendedor_id: z.string().uuid(),
  itens: z.array(cartItemSchema).min(1, "Venda precisa de pelo menos 1 item"),
  pagamentos: z.array(pagamentoSchema).min(1, "Informe pelo menos 1 pagamento"),
  desconto_total: z.number().min(0),
  observacoes: z.string().max(1000).optional(),
});

// ─── Types ───
export interface CartItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_original: number;
  preco_vendido: number;
  desconto: number;
  bonus: boolean;
  subtotal: number;
}

export interface Pagamento {
  forma: string;
  valor: number;
}

export interface VendaInput {
  empresa_id: string;
  cliente_id?: string | null;
  vendedor_id: string;
  itens: CartItem[];
  pagamentos: Pagamento[];
  desconto_total: number;
  observacoes?: string;
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
        .select("*")
        .eq("venda_id", vendaId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Finalizar venda ───
export function useFinalizarVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: VendaInput) => {
      const subtotalBruto = v.itens.reduce((s, i) => s + i.quantidade * i.preco_original, 0);
      const total = v.itens.reduce((s, i) => s + i.subtotal, 0);

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
      const itensPayload = v.itens.map((i) => ({
        venda_id: venda.id,
        produto_id: i.produto_id,
        nome_produto: i.nome,
        quantidade: i.quantidade,
        preco_original: i.preco_original,
        preco_vendido: i.preco_vendido,
        desconto: i.desconto,
        bonus: i.bonus,
        subtotal: i.subtotal,
      }));
      const { error: itensErr } = await supabase.from("itens_venda").insert(itensPayload);
      if (itensErr) throw itensErr;

      // 3. Registrar movimentos de estoque (saída)
      const movimentos = v.itens
        .filter((i) => i.quantidade > 0)
        .map((i) => ({
          empresa_id: v.empresa_id,
          produto_id: i.produto_id,
          vendedor_id: v.vendedor_id,
          tipo: "venda" as any,
          quantidade: i.quantidade,
          observacoes: `Venda #${venda.id.slice(0, 8)}`,
        }));
      if (movimentos.length > 0) {
        await supabase.from("movimentos_estoque").insert(movimentos);
      }

      return venda;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["movimentos_estoque"] });
      toast.success("Venda finalizada com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelarVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendaId: string) => {
      const { error } = await supabase
        .from("vendas")
        .update({ status: "cancelada" as any, updated_at: new Date().toISOString() })
        .eq("id", vendaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("Venda cancelada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
