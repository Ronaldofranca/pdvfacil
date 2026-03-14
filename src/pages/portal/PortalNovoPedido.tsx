import { useState } from "react";
import { Plus, Minus, ShoppingCart, Search, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface CartItem {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  imagem_url?: string | null;
}

export default function PortalNovoPedidoPage() {
  const { cliente } = usePortalAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [obs, setObs] = useState("");
  const [sending, setSending] = useState(false);

  const { data: produtos } = useQuery({
    queryKey: ["portal-produtos", cliente?.empresa_id],
    enabled: !!cliente?.empresa_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("produtos")
        .select("id, nome, preco, imagem_url, categoria_id")
        .eq("empresa_id", cliente!.empresa_id)
        .eq("ativo", true)
        .order("nome");
      return data ?? [];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["portal-categorias", cliente?.empresa_id],
    enabled: !!cliente?.empresa_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("categorias")
        .select("id, nome")
        .eq("empresa_id", cliente!.empresa_id)
        .eq("ativa", true)
        .order("nome");
      return data ?? [];
    },
  });

  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const filtered = produtos?.filter((p) => {
    const matchSearch = !search || p.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || p.categoria_id === selectedCat;
    return matchSearch && matchCat;
  });

  const addToCart = (p: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.produto_id === p.id);
      if (existing) {
        return prev.map((c) =>
          c.produto_id === p.id ? { ...c, quantidade: c.quantidade + 1 } : c
        );
      }
      return [...prev, { produto_id: p.id, nome: p.nome, preco: Number(p.preco), quantidade: 1, imagem_url: p.imagem_url }];
    });
  };

  const updateQty = (produtoId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.produto_id === produtoId ? { ...c, quantidade: c.quantidade + delta } : c))
        .filter((c) => c.quantidade > 0)
    );
  };

  const total = cart.reduce((s, c) => s + c.preco * c.quantidade, 0);

  const submitOrder = async () => {
    if (!cliente || cart.length === 0 || sending) return;

    // Validate vendedor_id exists
    if (!cliente.vendedor_id) {
      toast.error("Não foi possível identificar o vendedor responsável. Entre em contato com o suporte.");
      return;
    }

    // Validate cart items
    if (cart.some((c) => c.quantidade <= 0 || c.preco < 0)) {
      toast.error("Itens do carrinho com valores inválidos.");
      return;
    }

    // Sanitize observations (max 500 chars, strip HTML)
    const sanitizedObs = obs.replace(/<[^>]*>/g, "").trim().slice(0, 500);

    setSending(true);

    try {
      const { data: pedido, error: pErr } = await supabase
        .from("pedidos")
        .insert({
          empresa_id: cliente.empresa_id,
          cliente_id: cliente.id,
          vendedor_id: cliente.vendedor_id,
          data_prevista_entrega: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          status: "aguardando_entrega" as any,
          subtotal: total,
          valor_total: total,
          observacoes: sanitizedObs || "Pedido feito pelo portal do cliente",
        })
        .select("id")
        .single();

      if (pErr) throw pErr;

      const itens = cart.map((c) => ({
        empresa_id: cliente.empresa_id,
        pedido_id: pedido.id,
        produto_id: c.produto_id,
        nome_produto: c.nome.slice(0, 200),
        quantidade: c.quantidade,
        preco_original: c.preco,
        preco_pedido: c.preco,
        subtotal: c.preco * c.quantidade,
      }));

      const { error: iErr } = await supabase.from("itens_pedido").insert(itens);
      if (iErr) throw iErr;

      toast.success("Pedido enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["portal-pedidos"] });
      setCart([]);
      setObs("");
      navigate("/portal/pedidos");
    } catch (err: any) {
      console.error("Erro ao criar pedido:", err);
      toast.error("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Novo Pedido</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Categories */}
      {categorias && categorias.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={!selectedCat ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCat(null)}
          >
            Todas
          </Badge>
          {categorias.map((cat) => (
            <Badge
              key={cat.id}
              variant={selectedCat === cat.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCat(cat.id)}
            >
              {cat.nome}
            </Badge>
          ))}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered?.map((p) => {
          const inCart = cart.find((c) => c.produto_id === p.id);
          return (
            <Card key={p.id} className="overflow-hidden">
              {p.imagem_url && (
                <div className="aspect-square bg-muted">
                  <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-3">
                <p className="text-sm font-medium line-clamp-2">{p.nome}</p>
                <p className="text-sm font-bold text-primary mt-1">{fmtR(Number(p.preco))}</p>
                {inCart ? (
                  <div className="flex items-center justify-between mt-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(p.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-bold">{inCart.quantidade}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(p.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" className="w-full mt-2 gap-1" onClick={() => addToCart(p)}>
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <Card className="sticky bottom-16 md:bottom-4 border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                🛒 {cart.reduce((s, c) => s + c.quantidade, 0)} itens
              </span>
              <span className="text-lg font-bold">{fmtR(total)}</span>
            </div>
            <Textarea
              placeholder="Observações (opcional)"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
            />
            <Button className="w-full gap-2" onClick={submitOrder} disabled={sending}>
              <Send className="w-4 h-4" />
              {sending ? "Enviando..." : "Enviar Pedido"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
