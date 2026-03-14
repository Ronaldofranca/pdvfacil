import { useState, useEffect, useRef, useMemo } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Gift, Percent, DollarSign, X, RotateCcw, Package, Award, AlertTriangle, Layers } from "lucide-react";
import { usePDVPersistence } from "@/hooks/useFormPersistence";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useProdutos, useKits } from "@/hooks/useProdutos";
import { useEstoque } from "@/hooks/useEstoque";
import { useClientes } from "@/hooks/useClientes";
import { useFinalizarVenda, type CartItem, type Pagamento, type CrediarioConfig, type KitItemRef } from "@/hooks/useVendas";
import { useProdutosMaisVendidos, useProdutosRecentes, useProdutosDoCliente, useUltimaVendaCliente } from "@/hooks/useProdutosRapidos";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNiveisRecompensa, getNivelAtual } from "@/hooks/useNiveisRecompensa";
import { useClienteScoreById } from "@/hooks/useClienteScore";
import { CrediarioConfigPanel } from "./CrediarioConfig";
import { PDVMobile } from "./PDVMobile";
import { toast } from "sonner";

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "crediario", label: "Crediário" },
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
      <div className="flex items-center gap-2">
        {product.imagem_url ? (
          <img src={product.imagem_url} alt={product.nome} className="w-8 h-8 rounded-md object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            {product.is_kit ? <Layers className="w-3.5 h-3.5 text-primary" /> : <Package className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground">{product.nome}</p>
            {product.is_kit && <Badge variant="secondary" className="text-[9px] px-1 py-0">Kit</Badge>}
          </div>
          {product.codigo && <p className="text-xs text-muted-foreground">{product.codigo}</p>}
        </div>
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

export function PDVModal({ open, onOpenChange, initialCart, initialClienteId }: Props) {
  const isMobile = useIsMobile();
  const { profile, user, isAdmin } = useAuth();
  const { data: produtosRaw } = useProdutos();
  const { data: kitsRaw } = useKits();
  const { data: clientes } = useClientes();
  const { data: estoqueData } = useEstoque(user?.id);
  const finalizar = useFinalizarVenda();
  const { data: maisVendidos } = useProdutosMaisVendidos();
  const { data: recentes } = useProdutosRecentes();
  const { data: niveis } = useNiveisRecompensa();
  const pdvPersistence = usePDVPersistence();

  const defaultCrediario: CrediarioConfig = {
    entrada: 0,
    num_parcelas: 1,
    primeiro_vencimento: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    })(),
  };

  const [cart, setCart] = useState<CartItem[]>(initialCart ?? []);
  const [clienteId, setClienteId] = useState(initialClienteId ?? "");
  const [observacoes, setObservacoes] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ forma: "dinheiro", valor: 0 }]);
  const [searchProd, setSearchProd] = useState("");
  const [crediarioConfig, setCrediarioConfig] = useState<CrediarioConfig>(defaultCrediario);

  const hasCrediario = pagamentos.some((p) => p.forma === "crediario");

  // Navigation guard for unsaved PDV state
  useNavigationGuard(cart.length > 0);

  // Restore persisted PDV state on open
  const restoredRef = useRef(false);
  useEffect(() => {
    if (open && !restoredRef.current) {
      restoredRef.current = true;
      if (!initialCart?.length && !initialClienteId) {
        const saved = pdvPersistence.restore();
        if (saved && saved.cart?.length > 0) {
          setCart(saved.cart);
          setClienteId(saved.clienteId || "");
          setObservacoes(saved.observacoes || "");
          setPagamentos(saved.pagamentos?.length ? saved.pagamentos : [{ forma: "dinheiro", valor: 0 }]);
          if (saved.crediarioConfig) setCrediarioConfig(saved.crediarioConfig);
        }
      }
      if (initialCart?.length) setCart(initialCart);
      if (initialClienteId) setClienteId(initialClienteId);
    }
    if (!open) restoredRef.current = false;
  }, [open, initialCart, initialClienteId]);

  // Auto-save PDV state on changes
  useEffect(() => {
    if (cart.length > 0) {
      pdvPersistence.save({ cart, clienteId, observacoes, pagamentos, crediarioConfig });
    }
  }, [cart, clienteId, observacoes, pagamentos, crediarioConfig]);

  // Merge kits into product list
  const kitsAsProducts = useMemo(() => {
    if (!kitsRaw) return [];
    return kitsRaw
      .filter((k: any) => k.ativo)
      .map((k: any) => {
        const kitCusto = (k.kit_itens || []).reduce((sum: number, ki: any) => {
          const prodCusto = Number(ki.produtos?.custo ?? 0);
          return sum + prodCusto * Number(ki.quantidade);
        }, 0);
        return {
          id: `kit_${k.id}`,
          _kit_id: k.id,
          nome: `Kit ${k.nome}`,
          preco: k.preco,
          custo: kitCusto,
          imagem_url: k.imagem_url,
          codigo: "",
          ativo: true,
          is_kit: true,
          kit_itens: (k.kit_itens || []).map((ki: any) => ({
            produto_id: ki.produto_id,
            quantidade: Number(ki.quantidade),
          })),
        };
      });
  }, [kitsRaw]);

  const produtos = useMemo(() => [...(produtosRaw ?? []), ...kitsAsProducts], [produtosRaw, kitsAsProducts]);

  // Hydrate missing cost snapshots in restored carts/legacy carts
  useEffect(() => {
    if (!produtos.length) return;
    setCart((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (typeof item.custo_unitario === "number" && item.custo_unitario > 0) return item;
        const source = (produtos as any[]).find((p: any) => p.id === item.produto_id);
        if (!source) return item;
        const custo = Number(source.custo ?? 0);
        if (custo <= 0) return item;
        changed = true;
        return { ...item, custo_unitario: custo };
      });
      return changed ? next : prev;
    });
  }, [produtos]);

  const { data: produtosCliente } = useProdutosDoCliente(clienteId || null);
  const clienteScore = useClienteScoreById(clienteId || null);
  const { data: ultimaVendaItens } = useUltimaVendaCliente(clienteId || null);
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
      const item: CartItem = {
        produto_id: produto.id,
        nome: produto.nome,
        quantidade: 1,
        preco_original: Number(produto.preco),
        preco_vendido: Number(produto.preco),
        desconto: 0,
        bonus: false,
        subtotal: Number(produto.preco),
        custo_unitario: Number(produto.custo ?? 0),
      };
      if (produto.is_kit && produto.kit_itens) {
        item.is_kit = true;
        item.kit_itens = produto.kit_itens;
      }
      return [...prev, item];
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

  // ─── Tier discount ───
  const clienteSel = clientes?.find((c) => c.id === clienteId);
  const tierDesconto = (() => {
    if (!clienteSel || !niveis?.length) return 0;
    const nivel = getNivelAtual(Number((clienteSel as any).pontos_indicacao ?? 0), niveis);
    if (!nivel?.beneficios) return 0;
    const match = nivel.beneficios.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  })();

  const applyTierDiscount = () => {
    if (tierDesconto <= 0 || cart.length === 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.bonus) return item;
        const desc = Math.round(item.quantidade * item.preco_vendido * (tierDesconto / 100) * 100) / 100;
        const sub = item.quantidade * item.preco_vendido - desc;
        return { ...item, desconto: desc, subtotal: sub };
      })
    );
    toast.success(`Desconto de ${tierDesconto}% aplicado (nível do cliente)`);
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
    
    // Validate kit component stock for non-admin users
    if (!isAdmin) {
      const estoqueMap = new Map<string, number>();
      for (const e of estoqueData ?? []) {
        estoqueMap.set(e.produto_id, Number(e.quantidade));
      }
      for (const item of cart) {
        if (item.is_kit && item.kit_itens) {
          const missing: string[] = [];
          for (const ki of item.kit_itens) {
            const saldo = estoqueMap.get(ki.produto_id) ?? 0;
            if (saldo < ki.quantidade * item.quantidade) {
              const prod = (produtosRaw as any[])?.find((p: any) => p.id === ki.produto_id);
              missing.push(prod?.nome ?? ki.produto_id.slice(0, 8));
            }
          }
          if (missing.length > 0) {
            toast.error(`Kit "${item.nome}" sem estoque: ${missing.join(", ")}`);
            return;
          }
        }
      }
    }

    // Check fiado restriction
    if (hasCrediario) {
      if (!clienteId) return toast.error("Selecione um cliente para venda no crediário");
      const clienteFiado = clientes?.find((c) => c.id === clienteId);
      if (clienteFiado && (clienteFiado as any).permitir_fiado === false) {
        return toast.error("Este cliente está restrito para compras fiado. Permitir apenas pagamento à vista.");
      }
      if (crediarioConfig.num_parcelas < 1) return toast.error("Defina pelo menos 1 parcela");
    } else {
      if (totalPago < total) return toast.error("Valor pago insuficiente");
    }

    finalizar.mutate(
      {
        empresa_id: profile.empresa_id,
        cliente_id: clienteId || null,
        vendedor_id: user.id,
        itens: cart,
        pagamentos: hasCrediario
          ? [{ forma: "crediario", valor: total }]
          : pagamentos.filter((p) => p.valor > 0),
        desconto_total: totalDescontos,
        observacoes,
        crediario: hasCrediario ? crediarioConfig : undefined,
      },
      {
        onSuccess: () => {
          setCart([]);
          setClienteId("");
          setObservacoes("");
          setPagamentos([{ forma: "dinheiro", valor: 0 }]);
          pdvPersistence.clear();
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
    return <PDVMobile open={open} onOpenChange={onOpenChange} initialCart={initialCart} initialClienteId={initialClienteId} />;
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
            <div className="space-y-2">
              <Label className="text-xs">Cliente (opcional)</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                      {(c as any).permitir_fiado === false && " ⚠️ (Restrito fiado)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Fiado restriction warning */}
              {clienteId && clienteSel && (clienteSel as any).permitir_fiado === false && (
                <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-semibold">Cliente restrito para compras fiado — apenas à vista</span>
                </div>
              )}
              {/* Score badge */}
              {clienteId && clienteScore && (
                <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${
                  clienteScore.classificacao === "Risco" ? "bg-destructive/10" :
                  clienteScore.classificacao === "Regular" ? "bg-yellow-500/10" :
                  clienteScore.classificacao === "Bom" ? "bg-blue-500/10" : "bg-primary/10"
                }`}>
                  <span>{clienteScore.emoji}</span>
                  <span className={`font-semibold ${clienteScore.cor}`}>
                    Cliente {clienteScore.classificacao}
                  </span>
                  <span className="text-muted-foreground">({clienteScore.score} pts)</span>
                  {clienteScore.classificacao === "Risco" && (
                    <span className="text-destructive flex items-center gap-1 ml-auto">
                      <AlertTriangle className="w-3 h-3" /> Histórico de atraso
                    </span>
                  )}
                </div>
              )}
              {clienteId && ultimaVendaItens && ultimaVendaItens.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => {
                    setCart(ultimaVendaItens);
                    toast.success("Itens da última venda carregados!");
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Repetir última venda
                </Button>
              )}
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
                          {item.is_kit && <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0"><Layers className="w-2.5 h-2.5" />Kit</Badge>}
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

            {/* Tier discount */}
            {tierDesconto > 0 && cart.length > 0 && (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={applyTierDiscount}>
                <Award className="w-3.5 h-3.5 text-primary" />
                Aplicar desconto de nível ({tierDesconto}%)
              </Button>
            )}

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
              {!hasCrediario && troco > 0 && (
                <p className="text-sm font-medium text-green-600">Troco: {fmt(troco)}</p>
              )}
              {!hasCrediario && totalPago > 0 && totalPago < total && (
                <p className="text-sm font-medium text-destructive">Faltam: {fmt(total - totalPago)}</p>
              )}
            </div>

            {/* Crediário config */}
            {hasCrediario && (
              <CrediarioConfigPanel
                config={crediarioConfig}
                onChange={setCrediarioConfig}
                total={total}
                compact
              />
            )}

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
            disabled={finalizar.isPending || cart.length === 0 || (!hasCrediario && totalPago < total) || (hasCrediario && !clienteId)}
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
