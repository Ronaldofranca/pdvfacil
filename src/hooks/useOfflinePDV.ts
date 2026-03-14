import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, setCache, getCache } from "@/lib/offline/db";
import { useOffline } from "@/contexts/OfflineContext";
import { useAuth } from "@/contexts/AuthContext";
import { type CartItem, type Pagamento, type VendaInput, generateIdempotencyKey } from "@/hooks/useVendas";
import { toast } from "sonner";

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
 * When offline, queues the full sale as a single atomic RPC call
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

  // ─── Offline sale submission — enqueues a single atomic RPC call ───
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

      const subtotalBruto = input.itens.reduce((s, i) => s + i.quantidade * i.preco_original, 0);
      const total = input.itens.reduce((s, i) => s + i.subtotal, 0);
      const idempotencyKey = generateIdempotencyKey();

      // Prepare items payload matching the RPC signature
      const itensPayload = input.itens.map((i) => {
        const isKit = !!i.is_kit;
        const kitItens = i.kit_itens ?? [];
        let realKitId: string | null = null;
        if (isKit && kitItens.length) {
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
          kit_itens: kitItens,
          real_kit_id: realKitId,
        };
      });

      const hasCrediario = input.pagamentos.some((p) => p.forma === "crediario");

      try {
        // Enqueue a SINGLE RPC call — the syncEngine will call fn_finalizar_venda_atomica
        // This preserves full atomicity: either the entire sale succeeds or fails
        await enqueue("vendas", "rpc" as any, {
          fn_name: "fn_finalizar_venda_atomica",
          idempotency_key: idempotencyKey,
          params: {
            _idempotency_key: idempotencyKey,
            _empresa_id: profile.empresa_id,
            _cliente_id: input.cliente_id || null,
            _vendedor_id: user.id,
            _subtotal: subtotalBruto,
            _desconto_total: input.desconto_total,
            _total: total,
            _pagamentos: JSON.stringify(
              hasCrediario
                ? [{ forma: "crediario", valor: total }]
                : input.pagamentos.filter((p) => p.valor > 0)
            ),
            _observacoes: input.observacoes ?? "",
            _data_venda: new Date().toISOString(),
            _itens: JSON.stringify(itensPayload),
            _crediario: null, // Crediario config not available in offline simplified flow
          },
        });

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
