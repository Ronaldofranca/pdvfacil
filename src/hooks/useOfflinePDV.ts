import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, setCache, getCache } from "@/lib/offline/db";
import { useOffline } from "@/contexts/OfflineContext";
import { useAuth } from "@/contexts/AuthContext";
import { type CartItem, type Pagamento, type VendaInput } from "@/hooks/useVendas";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export interface CachedProduto {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  custo: number;
  ativo: boolean;
  categoria_id: string | null;
  categorias?: { nome: string } | null;
}

export interface CachedCliente {
  id: string;
  nome: string;
}

const CACHE_KEY_PRODUTOS = "pdv:produtos";
const CACHE_KEY_CLIENTES = "pdv:clientes";

/**
 * Caches products and clients to IndexedDB for offline PDV usage.
 * When offline, queues the full sale as multiple sync_queue items
 * that the syncEngine processes once connectivity is restored.
 */
export function useOfflinePDV() {
  const { isOnline, refreshCounts } = useOffline();
  const { profile, user } = useAuth();
  const qc = useQueryClient();

  // ─── Cache products & clients whenever online ───
  const cacheData = useCallback(async () => {
    try {
      const { data: produtos } = await supabase
        .from("produtos")
        .select("id, nome, codigo, preco, custo, ativo, categoria_id, categorias(nome)")
        .eq("ativo", true)
        .order("nome");

      if (produtos) {
        await setCache(CACHE_KEY_PRODUTOS, produtos);
      }

      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (clientes) {
        await setCache(CACHE_KEY_CLIENTES, clientes);
      }
    } catch (err) {
      console.warn("Failed to cache PDV data:", err);
    }
  }, []);

  // Refresh cache when online and on mount
  useEffect(() => {
    if (isOnline) {
      cacheData();
    }
  }, [isOnline, cacheData]);

  // ─── Get cached data ───
  const getCachedProdutos = useCallback(async (): Promise<CachedProduto[]> => {
    const cached = await getCache<CachedProduto[]>(CACHE_KEY_PRODUTOS);
    return cached ?? [];
  }, []);

  const getCachedClientes = useCallback(async (): Promise<CachedCliente[]> => {
    const cached = await getCache<CachedCliente[]>(CACHE_KEY_CLIENTES);
    return cached ?? [];
  }, []);

  // ─── Offline sale submission ───
  const finalizarVendaOffline = useCallback(
    async (input: {
      itens: CartItem[];
      pagamentos: Pagamento[];
      desconto_total: number;
      cliente_id?: string | null;
      observacoes?: string;
    }): Promise<boolean> => {
      if (!profile || !user) {
        toast.error("Usuário não autenticado");
        return false;
      }

      const vendaId = uuidv4();
      const subtotal = input.itens.reduce((s, i) => s + i.subtotal, 0);
      const total = subtotal; // desconto already applied in subtotals

      try {
        // 1. Queue: create venda
        await enqueue("vendas", "insert", {
          id: vendaId,
          empresa_id: profile.empresa_id,
          cliente_id: input.cliente_id || null,
          vendedor_id: user.id,
          status: "finalizada",
          subtotal: input.itens.reduce((s, i) => s + i.quantidade * i.preco_original, 0),
          desconto_total: input.desconto_total,
          total,
          pagamentos: input.pagamentos.filter((p) => p.valor > 0),
          observacoes: input.observacoes ?? "",
          data_venda: new Date().toISOString(),
        });

        // 2. Queue: insert each item
        for (const item of input.itens) {
          await enqueue("itens_venda", "insert", {
            id: uuidv4(),
            venda_id: vendaId,
            produto_id: item.produto_id,
            nome_produto: item.nome,
            quantidade: item.quantidade,
            preco_original: item.preco_original,
            preco_vendido: item.preco_vendido,
            desconto: item.desconto,
            bonus: item.bonus,
            subtotal: item.subtotal,
          });
        }

        // 3. Queue: stock movements
        for (const item of input.itens.filter((i) => i.quantidade > 0)) {
          await enqueue("movimentos_estoque", "insert", {
            id: uuidv4(),
            empresa_id: profile.empresa_id,
            produto_id: item.produto_id,
            vendedor_id: user.id,
            tipo: "venda",
            quantidade: item.quantidade,
            observacoes: `Venda #${vendaId.slice(0, 8)} (offline)`,
          });
        }

        await refreshCounts();
        toast.success("Venda salva localmente — será sincronizada quando houver internet");
        return true;
      } catch (err) {
        console.error("Offline sale error:", err);
        toast.error("Erro ao salvar venda offline");
        return false;
      }
    },
    [profile, user, refreshCounts]
  );

  return {
    isOnline,
    cacheData,
    getCachedProdutos,
    getCachedClientes,
    finalizarVendaOffline,
  };
}
