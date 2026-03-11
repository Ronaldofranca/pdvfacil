import { useState } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Gift, Percent, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useFinalizarVenda, type CartItem, type Pagamento } from "@/hooks/useVendas";
import { useProdutosMaisVendidos, useProdutosRecentes, useProdutosDoCliente } from "@/hooks/useProdutosRapidos";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { PDVMobile } from "./PDVMobile";
import { toast } from "sonner";

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCart?: CartItem[];
  initialClienteId?: string;
}

function DesktopProductButton({ product, onAdd, fmt }: { product: any; onAdd: (p: any) => void; fmt: (v: number) => string }) {
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent text-left transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{product.nome}</p>
        {product.codigo && <p className="text-xs text-muted-foreground">{product.codigo}</p>}
      </div>
      <span className="text-sm font-semibold text-primary">{fmt(Number(product.preco))}</span>
    </button>
  );
}

function DesktopQuickSection({ title, items, allProducts, onAdd, fmt }: {
  title: string;
  items: { produto_id: string; nome: string }[];
  allProducts: any[];
  onAdd: (p: any) => void;
  fmt: (v: number) => string;
}) {
  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const resolved = items.map((i) => productMap.get(i.produto_id)).filter((p): p is any => !!p && p.ativo);
  if (!resolved.length) return null;
  return (
    <div className="mb-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {resolved.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onAdd(p)}
            className="shrink-0 px-3 py-1.5 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
          >
            <p className="text-xs font-medium text-foreground truncate max-w-[100px]">{p.nome}</p>
            <p className="text-xs font-bold text-primary">{fmt(Number(p.preco))}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PDVModal({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const { profile, user } = useAuth();
  const { data: produtos } = useProdutos();
  const { data: clientes } = useClientes();
  const finalizar = useFinalizarVenda();
  const { data: maisVendidos } = useProdutosMaisVendidos();
  const { data: recentes } = useProdutosRecentes();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ forma: "dinheiro", valor: 0 }]);
  const [searchProd, setSearchProd] = useState("");

  const { data: produtosCliente } = useProdutosDoCliente(clienteId || null);
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

  const removeItem = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));

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
  const handleFinalizar = () => {
    if (!profile || !user) return;
    if (cart.length === 0) return toast.error("Adicione itens à venda");
    if (totalPago < total) return toast.error("Valor pago insuficiente");

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
          setCart([]);
          setClienteId("");
          setObservacoes("");
          setPagamentos([{ forma: "dinheiro", valor: 0 }]);
          onOpenChange(false);
        },
      }
    );
  };

  const filteredProdutos = produtos
    ?.filter((p) => p.ativo)
    .filter((p) => p.nome.toLowerCase().includes(searchProd.toLowerCase()) || p.codigo?.toLowerCase().includes(searchProd.toLowerCase()));

  // Mobile: use full-screen PDV
  if (isMobile) {
    return <PDVMobile open={open} onOpenChange={onOpenChange} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> PDV — Nova Venda
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* ─── LEFT: Produtos ─── */}
          <div className="lg:col-span-2 space-y-3">
            <Input placeholder="Buscar produto..." value={searchProd} onChange={(e) => setSearchProd(e.target.value)} />
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {searchProd.trim() ? (
                <div className="space-y-1">
                  {filteredProdutos?.map((p) => (
                    <DesktopProductButton key={p.id} product={p} onAdd={addToCart} fmt={fmt} />
                  ))}
                  {!filteredProdutos?.length && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto</p>
                  )}
                </div>
              ) : (
                <>
                  {clienteId && produtosCliente && produtosCliente.length > 0 && (
                    <DesktopQuickSection title="Produtos deste cliente" items={produtosCliente} allProducts={produtos ?? []} onAdd={addToCart} fmt={fmt} />
                  )}
                  {maisVendidos && maisVendidos.length > 0 && (
                    <DesktopQuickSection title="Mais vendidos" items={maisVendidos} allProducts={produtos ?? []} onAdd={addToCart} fmt={fmt} />
                  )}
                  {recentes && recentes.length > 0 && (
                    <DesktopQuickSection title="Recentes" items={recentes} allProducts={produtos ?? []} onAdd={addToCart} fmt={fmt} />
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Todos</p>
                    {produtos?.filter((p) => p.ativo).map((p) => (
                      <DesktopProductButton key={p.id} product={p} onAdd={addToCart} fmt={fmt} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Cliente */}
            <div>
              <Label className="text-xs">Cliente (opcional)</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ─── RIGHT: Carrinho ─── */}
          <div className="lg:col-span-3 space-y-3">
            {/* Itens */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carrinho vazio</p>
              ) : (
                cart.map((item, idx) => (
                  <Card key={item.produto_id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.nome}</span>
                          {item.bonus && <Badge variant="secondary" className="text-xs gap-1"><Gift className="w-3 h-3" />Bônus</Badge>}
                        </div>
                      </div>
                      <span className="font-bold text-primary">{item.bonus ? "R$ 0,00" : fmt(item.subtotal)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Qty */}
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(idx, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQty(idx, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      {/* Preço */}
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 w-20 text-xs"
                          value={item.preco_vendido}
                          onChange={(e) => updateItem(idx, { preco_vendido: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      {/* Desconto */}
                      <div className="flex items-center gap-1">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 w-20 text-xs"
                          placeholder="Desc."
                          value={item.desconto || ""}
                          onChange={(e) => updateItem(idx, { desconto: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      {/* Bônus */}
                      <Button
                        type="button"
                        variant={item.bonus ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => updateItem(idx, { bonus: !item.bonus })}
                      >
                        <Gift className="w-3 h-3" />
                        Bônus
                      </Button>
                      {/* Remove */}
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => removeItem(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <Separator />

            {/* Totais */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
              {totalDescontos > 0 && (
                <div className="flex justify-between text-destructive"><span>Descontos / Bônus</span><span>-{fmt(totalDescontos)}</span></div>
              )}
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{fmt(total)}</span></div>
            </div>

            <Separator />

            {/* Pagamentos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Pagamento</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={autoFillPagamento}>Auto-preencher</Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={addPagamento}>
                    <Plus className="w-3 h-3" /> Forma
                  </Button>
                </div>
              </div>
              {pagamentos.map((pag, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select value={pag.forma} onValueChange={(v) => updatePagamento(idx, "forma", v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-xs flex-1"
                    value={pag.valor || ""}
                    onChange={(e) => updatePagamento(idx, "valor", parseFloat(e.target.value) || 0)}
                    placeholder="R$ 0,00"
                  />
                  {pagamentos.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePagamento(idx)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {troco > 0 && (
                <p className="text-sm font-medium text-green-600">Troco: {fmt(troco)}</p>
              )}
              {totalPago > 0 && totalPago < total && (
                <p className="text-sm font-medium text-destructive">Faltam: {fmt(total - totalPago)}</p>
              )}
            </div>

            {/* Obs */}
            <Textarea placeholder="Observações..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="text-xs" rows={2} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-3 border-t">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            type="button"
            className="flex-1 gap-1.5"
            disabled={finalizar.isPending || cart.length === 0 || totalPago < total}
            onClick={handleFinalizar}
          >
            <ShoppingCart className="w-4 h-4" />
            {finalizar.isPending ? "Finalizando..." : `Finalizar ${fmt(total)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
