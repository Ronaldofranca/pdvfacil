import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Plus, Minus, Trash2, Gift, Package, Search, Image as ImageIcon } from "lucide-react";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useCriarPedido, useAtualizarPedido, usePedidoItens, type Pedido } from "@/hooks/usePedidos";
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem } from "@/hooks/useVendas";
import { addItemToCart, markOneUnitAsGift, unmarkOneGift, removeCartLine, changeLineQty } from "@/lib/cartUtils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId?: string | null;
  initialData?: Pedido | null;
}

export function PedidoForm({ open, onOpenChange, pedidoId, initialData }: Props) {
  const { profile, user } = useAuth();
  const { data: produtos } = useProdutos();
  const { data: clientes } = useClientes();
  const criarPedido = useCriarPedido();
  const atualizarPedido = useAtualizarPedido();
  const { data: itensExistentes, isLoading: loadingItens } = usePedidoItens(pedidoId ?? null);

  const [clienteId, setClienteId] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horario, setHorario] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchProd, setSearchProd] = useState("");

  // Populate form if editing
  useEffect(() => {
    if (open && pedidoId && initialData) {
      setClienteId(initialData.cliente_id);
      setDataEntrega(initialData.data_prevista_entrega);
      setHorario(initialData.horario_entrega || "");
      setObservacoes(initialData.observacoes || "");
    } else if (open && !pedidoId) {
      // Reset if opening for new
      setClienteId("");
      setDataEntrega("");
      setHorario("");
      setObservacoes("");
      setCart([]);
    }
  }, [open, pedidoId, initialData]);

  // Map existing items to cart
  useEffect(() => {
    if (open && pedidoId && itensExistentes) {
      const mappedCart: CartItem[] = itensExistentes.map((i) => ({
        line_id: i.id,
        produto_id: i.produto_id,
        nome: i.nome_produto,
        quantidade: Number(i.quantidade),
        preco_original: Number(i.preco_original),
        preco_vendido: Number(i.preco_pedido),
        desconto: Number(i.desconto),
        bonus: i.bonus,
        subtotal: Number(i.subtotal),
        custo_unitario: Number(i.produtos?.custo ?? 0),
        imagem_url: i.produtos?.imagem_url, // Added support for images
      } as any));
      setCart(mappedCart);
    }
  }, [open, pedidoId, itensExistentes]);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const addToCart = (p: any) => {
    const itemToAdd = {
      ...p,
      imagem_url: p.imagem_url, // Ensure image is passed to cartUtils if supported, or handled here
    };
    setCart((prev) => {
      const newCart = addItemToCart(prev, itemToAdd);
      // Ensure the image URL is preserved in the cart item
      return newCart.map(item => 
        item.produto_id === p.id 
          ? { ...item, imagem_url: p.imagem_url } as any 
          : item
      );
    });
  };

  const changeQty = (lineId: string, delta: number) => {
    setCart((prev) => changeLineQty(prev, lineId, delta));
  };

  const removeItem = (lineId: string) => setCart((prev) => removeCartLine(prev, lineId));

  const toggleBonus = (lineId: string, isBonus: boolean) => {
    if (isBonus) {
      setCart((prev) => unmarkOneGift(prev, lineId));
    } else {
      setCart((prev) => markOneUnitAsGift(prev, lineId));
    }
  };

  const total = cart.reduce((s, i) => s + i.subtotal, 0);
  const totalDescontos = cart.reduce((s, i) => s + i.desconto + (i.bonus ? i.quantidade * i.preco_original : 0), 0);

  const filteredProdutos = produtos?.filter((p) => p.ativo).filter((p) =>
    p.nome.toLowerCase().includes(searchProd.toLowerCase()) || p.codigo?.toLowerCase().includes(searchProd.toLowerCase())
  );

  const handleSalvar = () => {
    if (!profile || !user) return;
    if (!clienteId) return toast.error("Selecione um cliente");
    if (!dataEntrega) return toast.error("Informe a data prevista de entrega");
    if (cart.length === 0) return toast.error("Adicione pelo menos um item");

    const payload = {
      empresa_id: profile.empresa_id,
      cliente_id: clienteId,
      vendedor_id: user.id,
      data_prevista_entrega: dataEntrega,
      horario_entrega: horario,
      itens: cart,
      desconto: totalDescontos,
      observacoes,
    };

    if (pedidoId) {
      atualizarPedido.mutate({ id: pedidoId, input: payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      criarPedido.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = criarPedido.isPending || atualizarPedido.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> 
            {pedidoId ? "Editar Pedido" : "Novo Pedido"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT: Produtos */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={searchProd} onChange={(e) => setSearchProd(e.target.value)} className="pl-9" />
            </div>
            <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
              {filteredProdutos?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="w-8 h-8 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.nome}</p>
                      {p.codigo && <p className="text-xs text-muted-foreground">{p.codigo}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{fmt(Number(p.preco))}</span>
                </button>
              ))}
            </div>

            {/* Cliente e data */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                  <SelectContent>
                    {clientes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Data de Entrega *</Label>
                  <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Horário (opcional)</Label>
                  <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Observações do pedido..." />
              </div>
            </div>
          </div>

          {/* RIGHT: Carrinho */}
          <div className="lg:col-span-3 space-y-3">
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {loadingItens ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando itens...</p>
              ) : cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carrinho vazio — adicione produtos</p>
              ) : (
                cart.map((item) => (
                  <Card key={item.line_id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex gap-3 items-center">
                        {(item as any).imagem_url ? (
                          <img src={(item as any).imagem_url} alt={item.nome} className="w-10 h-10 rounded-md object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border shrink-0">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.nome}</span>
                            {item.bonus && <Badge variant="secondary" className="text-xs gap-1"><Gift className="w-3 h-3" />Bônus</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground font-semibold">{fmt(item.preco_vendido)}</span>
                        </div>
                      </div>
                      <span className="font-bold text-primary">{item.bonus ? "R$ 0,00" : fmt(item.subtotal)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(item.line_id, -1)}><Minus className="w-3 h-3" /></Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(item.line_id, 1)}><Plus className="w-3 h-3" /></Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Marcar como bonificação" onClick={() => toggleBonus(item.line_id, item.bonus)}>
                        <Gift className={`w-3.5 h-3.5 ${item.bonus ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.line_id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Itens</span><span>{cart.length}</span></div>
              {totalDescontos > 0 && (
                <div className="flex justify-between text-destructive"><span>Descontos</span><span>-{fmt(totalDescontos)}</span></div>
              )}
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{fmt(total)}</span></div>
            </div>

            <Button className="w-full h-12 text-base" onClick={handleSalvar} disabled={isPending}>
              {isPending ? "Salvando..." : pedidoId ? "Atualizar Pedido" : "Criar Pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
