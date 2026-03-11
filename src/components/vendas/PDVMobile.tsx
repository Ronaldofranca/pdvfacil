import { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Gift,
  DollarSign, X, Package, CreditCard, Check, WifiOff, Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useFinalizarVenda, type CartItem, type Pagamento } from "@/hooks/useVendas";
import { useOfflinePDV, type CachedProduto, type CachedCliente } from "@/hooks/useOfflinePDV";
import { useOffline } from "@/contexts/OfflineContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

type Step = "produtos" | "carrinho" | "pagamento";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDVMobile({ open, onOpenChange }: Props) {
  const { profile, user } = useAuth();
  const { data: onlineProdutos } = useProdutos();
  const { data: onlineClientes } = useClientes();
  const finalizar = useFinalizarVenda();
  const { isOnline, pendingCount } = useOffline();
  const { getCachedProdutos, getCachedClientes, finalizarVendaOffline } = useOfflinePDV();

  const [step, setStep] = useState<Step>("produtos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ forma: "dinheiro", valor: 0 }]);
  const [searchProd, setSearchProd] = useState("");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Offline-cached data
  const [cachedProdutos, setCachedProdutos] = useState<CachedProduto[]>([]);
  const [cachedClientes, setCachedClientes] = useState<CachedCliente[]>([]);

  // Load cached data on mount (for offline fallback)
  useEffect(() => {
    getCachedProdutos().then(setCachedProdutos);
    getCachedClientes().then(setCachedClientes);
  }, [getCachedProdutos, getCachedClientes]);

  // Use online data when available, fall back to cache
  const produtos = isOnline && onlineProdutos ? onlineProdutos : cachedProdutos;
  const clientes = isOnline && onlineClientes ? onlineClientes : cachedClientes;

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // ─── Cart operations ───
  const addToCart = (produto: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.produto_id === produto.id);
      if (existing) {
        return prev.map((i) =>
          i.produto_id === produto.id
            ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco_vendido }
            : i
        );
      }
      return [
        ...prev,
        {
          produto_id: produto.id,
          nome: produto.nome,
          quantidade: 1,
          preco_original: Number(produto.preco),
          preco_vendido: Number(produto.preco),
          desconto: 0,
          bonus: false,
          subtotal: Number(produto.preco),
        },
      ];
    });
    toast.success(`${produto.nome} adicionado`);
  };

  const updateItem = (idx: number, updates: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const merged = { ...item, ...updates };
        if (merged.bonus) {
          merged.subtotal = 0;
        } else {
          merged.subtotal = merged.quantidade * merged.preco_vendido - merged.desconto;
        }
        return merged;
      })
    );
  };

  const removeItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
    setEditingItem(null);
  };

  const changeQty = (idx: number, delta: number) => {
    const item = cart[idx];
    const newQty = Math.max(1, item.quantidade + delta);
    updateItem(idx, { quantidade: newQty });
  };

  // ─── Totals ───
  const subtotal = cart.reduce((s, i) => s + i.quantidade * i.preco_original, 0);
  const totalDescontos = cart.reduce((s, i) => s + i.desconto + (i.bonus ? i.quantidade * i.preco_vendido : 0), 0);
  const total = cart.reduce((s, i) => s + i.subtotal, 0);
  const totalPago = pagamentos.reduce((s, p) => s + p.valor, 0);
  const troco = totalPago - total;

  // ─── Pagamentos ───
  const addPagamento = () => setPagamentos([...pagamentos, { forma: "dinheiro", valor: 0 }]);
  const removePagamento = (idx: number) => setPagamentos(pagamentos.filter((_, i) => i !== idx));
  const updatePagamento = (idx: number, field: keyof Pagamento, value: string | number) => {
    setPagamentos((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const autoFillPagamento = () => {
    if (pagamentos.length === 1) {
      setPagamentos([{ ...pagamentos[0], valor: total }]);
    }
  };

  // ─── Finalizar ───
  const handleFinalizar = async () => {
    if (!profile || !user) return;
    if (cart.length === 0) return toast.error("Adicione itens à venda");
    if (totalPago < total) return toast.error("Valor pago insuficiente");

    setIsSubmitting(true);

    if (isOnline) {
      // Online: use normal mutation
      finalizar.mutate(
        {
          empresa_id: profile.empresa_id,
          cliente_id: clienteId || null,
          vendedor_id: user.id,
          itens: cart,
          pagamentos: pagamentos.filter((p) => p.valor > 0),
          desconto_total: totalDescontos,
          observacoes,
        },
        {
          onSuccess: () => {
            resetForm();
            onOpenChange(false);
            setIsSubmitting(false);
          },
          onError: () => setIsSubmitting(false),
        }
      );
    } else {
      // Offline: queue to IndexedDB
      const success = await finalizarVendaOffline({
        itens: cart,
        pagamentos: pagamentos.filter((p) => p.valor > 0),
        desconto_total: totalDescontos,
        cliente_id: clienteId || null,
        observacoes,
      });
      if (success) {
        resetForm();
        onOpenChange(false);
      }
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setClienteId("");
    setObservacoes("");
    setPagamentos([{ forma: "dinheiro", valor: 0 }]);
    setStep("produtos");
  };

  const filteredProdutos = useMemo(
    () =>
      (produtos as any[])
        ?.filter((p: any) => p.ativo !== false)
        .filter(
          (p: any) =>
            p.nome.toLowerCase().includes(searchProd.toLowerCase()) ||
            p.codigo?.toLowerCase().includes(searchProd.toLowerCase())
        ),
    [produtos, searchProd]
  );

  const handleClose = () => {
    onOpenChange(false);
    setStep("produtos");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-background shrink-0 safe-area-top">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={handleClose}>
          <X className="w-5 h-5" /> Fechar
        </Button>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5">
              <WifiOff className="w-3 h-3" /> Offline
              {pendingCount > 0 && ` (${pendingCount})`}
            </Badge>
          )}
          <h2 className="font-bold text-foreground">PDV</h2>
        </div>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 -mr-2 relative"
            onClick={() => setStep("carrinho")}
          >
            <ShoppingCart className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {cart.length}
            </Badge>
          </Button>
        )}
        {cart.length === 0 && <div className="w-16" />}
      </div>

      {/* ─── Step Tabs ─── */}
      <div className="flex border-b shrink-0">
        {[
          { key: "produtos" as Step, icon: Package, label: "Produtos" },
          { key: "carrinho" as Step, icon: ShoppingCart, label: `Carrinho (${cart.length})` },
          { key: "pagamento" as Step, icon: CreditCard, label: "Pagamento" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStep(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors
              ${step === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* STEP: Produtos */}
        {step === "produtos" && (
          <div className="flex flex-col h-full">
            <div className="p-3 sticky top-0 bg-background z-10 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-12 text-base"
                  placeholder="Buscar produto..."
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 p-3 space-y-1.5">
              {filteredProdutos?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border bg-card active:bg-accent transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-foreground">{p.nome}</p>
                    {p.codigo && <p className="text-xs text-muted-foreground mt-0.5">{p.codigo}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{fmt(Number(p.preco))}</span>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </button>
              ))}
              {!filteredProdutos?.length && (
                <p className="text-muted-foreground text-center py-12">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* STEP: Carrinho */}
        {step === "carrinho" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Carrinho vazio</p>
                  <Button variant="outline" onClick={() => setStep("produtos")}>
                    Adicionar produtos
                  </Button>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <Card key={item.produto_id} className="p-3">
                    {/* Item header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{item.nome}</span>
                          {item.bonus && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5">
                              <Gift className="w-2.5 h-2.5" />Bônus
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.quantidade}x {fmt(item.preco_vendido)}
                          {item.desconto > 0 && ` (desc: ${fmt(item.desconto)})`}
                        </p>
                      </div>
                      <span className="font-bold text-primary text-base">
                        {item.bonus ? "R$ 0,00" : fmt(item.subtotal)}
                      </span>
                    </div>

                    {/* Quantity row */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => changeQty(idx, -1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-10 text-center font-bold text-base">{item.quantidade}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => changeQty(idx, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant={item.bonus ? "default" : "outline"}
                          size="sm"
                          className="h-9 text-xs gap-1"
                          onClick={() => updateItem(idx, { bonus: !item.bonus })}
                        >
                          <Gift className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => setEditingItem(editingItem === idx ? null : idx)}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Editing panel */}
                    {editingItem === idx && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Preço unitário</Label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-11 text-base mt-1"
                            value={item.preco_vendido}
                            onChange={(e) =>
                              updateItem(idx, { preco_vendido: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Desconto (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-11 text-base mt-1"
                            value={item.desconto || ""}
                            placeholder="0,00"
                            onChange={(e) =>
                              updateItem(idx, { desconto: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}

              {/* Cliente */}
              {cart.length > 0 && (
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground">Cliente (opcional)</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger className="h-11 mt-1">
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Cart footer summary */}
            {cart.length > 0 && (
              <div className="border-t p-3 bg-background space-y-2 shrink-0 safe-area-bottom">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  {totalDescontos > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Descontos</span>
                      <span>-{fmt(totalDescontos)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{fmt(total)}</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base gap-2"
                  onClick={() => setStep("pagamento")}
                >
                  <CreditCard className="w-5 h-5" />
                  Ir para Pagamento
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP: Pagamento */}
        {step === "pagamento" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-3 space-y-4">
              {/* Resumo */}
              <Card className="p-3 space-y-1 text-sm">
                <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Resumo da Venda</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{cart.length} {cart.length === 1 ? "item" : "itens"}</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {totalDescontos > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Descontos</span>
                    <span>-{fmt(totalDescontos)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{fmt(total)}</span>
                </div>
              </Card>

              {/* Formas de pagamento */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Pagamento</Label>
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={autoFillPagamento}>
                    Auto-preencher
                  </Button>
                </div>
                {pagamentos.map((pag, idx) => (
                  <Card key={idx} className="p-3 space-y-2">
                    <Select value={pag.forma} onValueChange={(v) => updatePagamento(idx, "forma", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-11 text-base flex-1"
                        value={pag.valor || ""}
                        onChange={(e) => updatePagamento(idx, "valor", parseFloat(e.target.value) || 0)}
                        placeholder="R$ 0,00"
                      />
                      {pagamentos.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => removePagamento(idx)}>
                          <X className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                <Button variant="outline" className="w-full h-11 gap-2" onClick={addPagamento}>
                  <Plus className="w-4 h-4" /> Adicionar forma de pagamento
                </Button>

                {troco > 0 && (
                  <p className="text-sm font-semibold text-green-600 text-center">Troco: {fmt(troco)}</p>
                )}
                {totalPago > 0 && totalPago < total && (
                  <p className="text-sm font-semibold text-destructive text-center">
                    Faltam: {fmt(total - totalPago)}
                  </p>
                )}
              </div>

              {/* Obs */}
              <div>
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <Textarea
                  placeholder="Observações da venda..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            {/* Finalizar footer */}
            <div className="border-t p-3 bg-background shrink-0 safe-area-bottom">
              <Button
                className="w-full h-14 text-lg gap-2 font-bold"
                disabled={finalizar.isPending || cart.length === 0 || totalPago < total}
                onClick={handleFinalizar}
              >
                <Check className="w-6 h-6" />
                {finalizar.isPending ? "Finalizando..." : `Finalizar ${fmt(total)}`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom floating cart button (on produtos step) ─── */}
      {step === "produtos" && cart.length > 0 && (
        <div className="border-t p-3 bg-background shrink-0 safe-area-bottom">
          <Button
            className="w-full h-12 text-base gap-2"
            onClick={() => setStep("carrinho")}
          >
            <ShoppingCart className="w-5 h-5" />
            Ver Carrinho ({cart.length}) — {fmt(total)}
          </Button>
        </div>
      )}
    </div>
  );
}
