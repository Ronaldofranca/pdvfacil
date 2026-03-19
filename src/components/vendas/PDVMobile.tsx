import { useState, useMemo, useEffect, useRef } from "react";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Gift,
  DollarSign, X, Package, CreditCard, Check, WifiOff,
  RotateCcw, Users, ChevronRight, Zap, Star, Award, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useProdutos, useKits } from "@/hooks/useProdutos";
import { useEstoque } from "@/hooks/useEstoque";
import { useClientes } from "@/hooks/useClientes";
import { useFinalizarVenda, generateIdempotencyKey, type CartItem, type Pagamento, type CrediarioConfig, type KitItemRef } from "@/hooks/useVendas";
import { useProdutosMaisVendidos, useProdutosRecentes, useProdutosDoCliente, useUltimaVendaCliente } from "@/hooks/useProdutosRapidos";
import { useOfflinePDV, type CachedProduto, type CachedCliente } from "@/hooks/useOfflinePDV";
import { useOffline } from "@/contexts/OfflineContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNiveisRecompensa, getNivelAtual } from "@/hooks/useNiveisRecompensa";
import { useClienteScoreById } from "@/hooks/useClienteScore";
import { CrediarioConfigPanel } from "./CrediarioConfig";
import { usePDVPersistence } from "@/hooks/useFormPersistence";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { addItemToCart, markOneUnitAsGift, unmarkOneGift, updateCartItem, changeLineQty, removeCartLine, ensureAllLineIds } from "@/lib/cartUtils";
import { toast } from "sonner";

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "💵 Dinheiro" },
  { value: "pix", label: "📱 PIX" },
  { value: "cartao_credito", label: "💳 Crédito" },
  { value: "cartao_debito", label: "💳 Débito" },
  { value: "crediario", label: "📋 Crediário" },
  { value: "boleto", label: "📄 Boleto" },
  { value: "transferencia", label: "🏦 Transferência" },
];

type Step = "cliente" | "produtos" | "carrinho" | "pagamento";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCart?: CartItem[];
  initialClienteId?: string;
}

export function PDVMobile({ open, onOpenChange, initialCart, initialClienteId }: Props) {
  const { profile, user, isAdmin } = useAuth();
  const { data: onlineProdutos } = useProdutos();
  const { data: onlineKits } = useKits();
  const { data: onlineClientes } = useClientes();
  const { data: estoqueData } = useEstoque(user?.id);
  const finalizar = useFinalizarVenda();
  const { data: maisVendidos } = useProdutosMaisVendidos();
  const { data: recentes } = useProdutosRecentes();
  const { isOnline, pendingCount } = useOffline();
  const { getCachedProdutos, getCachedClientes, finalizarVendaOffline } = useOfflinePDV();
  const { data: niveis } = useNiveisRecompensa();
  const pdvPersistence = usePDVPersistence();

  const [step, setStep] = useState<Step>("cliente");
  const [cart, setCart] = useState<CartItem[]>(initialCart ?? []);
  const [clienteId, setClienteId] = useState(initialClienteId ?? "");
  const [observacoes, setObservacoes] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([{ forma: "dinheiro", valor: 0 }]);
  const [searchProd, setSearchProd] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"todos" | "produtos" | "kits">("todos");
  const [kitDetailId, setKitDetailId] = useState<string | null>(null);
  const [expandedCartKit, setExpandedCartKit] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crediarioConfig, setCrediarioConfig] = useState<CrediarioConfig>({
    entrada: 0,
    num_parcelas: 1,
    primeiro_vencimento: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    })(),
  });

  const hasCrediario = pagamentos.some((p) => p.forma === "crediario");

  // Navigation guard
  useNavigationGuard(cart.length > 0);

  const { data: produtosCliente } = useProdutosDoCliente(clienteId || null);
  const { data: ultimaVendaItens } = useUltimaVendaCliente(clienteId || null);
  const clienteScore = useClienteScoreById(clienteId || null);

  const [cachedProdutos, setCachedProdutos] = useState<CachedProduto[]>([]);
  const [cachedClientes, setCachedClientes] = useState<CachedCliente[]>([]);

  useEffect(() => {
    getCachedProdutos().then(setCachedProdutos);
    getCachedClientes().then(setCachedClientes);
  }, [getCachedProdutos, getCachedClientes]);

  // Restore persisted state on open
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
          if (saved.step) setStep(saved.step as Step);
          else setStep("carrinho");
        }
      }
      if (initialCart?.length) {
        setCart(initialCart);
        setStep("carrinho");
      }
      if (initialClienteId) {
        setClienteId(initialClienteId);
        if (!initialCart?.length) setStep("produtos");
      }
    }
    if (!open) restoredRef.current = false;
  }, [open, initialCart, initialClienteId]);

  // Auto-save PDV state
  useEffect(() => {
    if (cart.length > 0) {
      pdvPersistence.save({ cart, clienteId, observacoes, pagamentos, crediarioConfig, step });
    }
  }, [cart, clienteId, observacoes, pagamentos, crediarioConfig, step]);

  // Merge kits into product list for unified search
  const kitsAsProducts = useMemo(() => {
    if (!onlineKits) return [];
    return onlineKits
      .filter((k: any) => k.ativo)
      .map((k: any) => {
        // Compute kit cost from component costs
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
  }, [onlineKits]);

  const produtosBase = isOnline && onlineProdutos ? onlineProdutos : cachedProdutos;
  const produtos = useMemo(() => [...(produtosBase as any[] || []), ...kitsAsProducts], [produtosBase, kitsAsProducts]);

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
  const clientes = isOnline && onlineClientes ? onlineClientes : cachedClientes;

  const clienteSelecionado = clientes?.find((c) => c.id === clienteId);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // ─── Cart operations ───
  const addToCart = (produto: any) => {
    setCart((prev) => addItemToCart(prev, produto));
    toast.success(`${produto.nome} adicionado`);
  };

  const updateItem = (lineId: string, updates: Partial<CartItem>) => {
    setCart((prev) => updateCartItem(prev, lineId, updates));
  };

  const removeItem = (lineId: string) => {
    setCart((prev) => removeCartLine(prev, lineId));
    setEditingItem(null);
  };

  const changeQty = (lineId: string, delta: number) => {
    setCart((prev) => changeLineQty(prev, lineId, delta));
  };

  const handleMarkGift = (lineId: string, isBonus: boolean) => {
    if (isBonus) {
      setCart((prev) => unmarkOneGift(prev, lineId));
    } else {
      setCart((prev) => markOneUnitAsGift(prev, lineId));
    }
  };

  // ─── Tier discount ───
  const tierDesconto = (() => {
    if (!clienteSelecionado || !niveis?.length) return 0;
    const nivel = getNivelAtual(Number((clienteSelecionado as any).pontos_indicacao ?? 0), niveis);
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

  // ─── Finalizar (with idempotency lock) ───
  const finalizingRef = useRef(false);
  const [finalizingStep, setFinalizingStep] = useState("");

  const handleFinalizar = async () => {
    if (!profile || !user) return;
    if (cart.length === 0) return toast.error("Adicione itens à venda");
    if (finalizingRef.current || isSubmitting || finalizar.isPending) return; // Block duplicate calls
    
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
              const prod = (onlineProdutos as any[])?.find((p: any) => p.id === ki.produto_id);
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

    if (hasCrediario) {
      if (!clienteId) return toast.error("Selecione um cliente para venda no crediário");
      const clienteFiado = clientes?.find((c: any) => c.id === clienteId);
      if (clienteFiado && (clienteFiado as any).permitir_fiado === false) {
        return toast.error("Este cliente está restrito para compras fiado. Permitir apenas pagamento à vista.");
      }
      if (crediarioConfig.num_parcelas < 1) return toast.error("Defina pelo menos 1 parcela");
    } else {
      if (totalPago < total) return toast.error("Valor pago insuficiente");
    }

    // Lock finalization
    finalizingRef.current = true;
    setIsSubmitting(true);
    const idempotencyKey = generateIdempotencyKey();

    setFinalizingStep("Finalizando venda...");
    const stepTimers = [
      setTimeout(() => { if (finalizingRef.current) setFinalizingStep("Gravando itens e estoque..."); }, 1500),
      setTimeout(() => { if (finalizingRef.current) setFinalizingStep("Gerando parcelas..."); }, 3000),
      setTimeout(() => { if (finalizingRef.current) setFinalizingStep("Concluindo..."); }, 4500),
    ];

    const cleanup = () => {
      finalizingRef.current = false;
      setIsSubmitting(false);
      setFinalizingStep("");
      stepTimers.forEach(clearTimeout);
    };

    if (isOnline) {
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
          idempotency_key: idempotencyKey,
        },
        {
          onSuccess: () => {
            cleanup();
            resetForm();
            onOpenChange(false);
          },
          onError: () => cleanup(),
        }
      );
    } else {
      const success = await finalizarVendaOffline({
        itens: cart,
        pagamentos: pagamentos.filter((p) => p.valor > 0),
        desconto_total: totalDescontos,
        cliente_id: clienteId || null,
        observacoes,
      });
      cleanup();
      if (success) {
        resetForm();
        onOpenChange(false);
      }
    }
  };

  const resetForm = () => {
    setCart([]);
    setClienteId("");
    setObservacoes("");
    setPagamentos([{ forma: "dinheiro", valor: 0 }]);
    setSearchProd("");
    setSearchCliente("");
    setStep("cliente");
    setEditingItem(null);
    pdvPersistence.clear();
  };

  const filteredProdutos = useMemo(
    () =>
      (produtos as any[])
        ?.filter((p: any) => p.ativo !== false)
        .filter((p: any) => {
          if (filterType === "kits") return p.is_kit;
          if (filterType === "produtos") return !p.is_kit;
          return true;
        })
        .filter(
          (p: any) =>
            p.nome.toLowerCase().includes(searchProd.toLowerCase()) ||
            p.codigo?.toLowerCase().includes(searchProd.toLowerCase())
        ),
    [produtos, searchProd, filterType]
  );

  // Kit detail data for modal
  const kitDetailData = useMemo(() => {
    if (!kitDetailId) return null;
    const kit = onlineKits?.find((k: any) => k.id === kitDetailId);
    if (!kit) return null;
    return kit;
  }, [kitDetailId, onlineKits]);

  const filteredClientes = useMemo(
    () =>
      (clientes as any[])?.filter(
        (c: any) =>
          c.nome?.toLowerCase().includes(searchCliente.toLowerCase()) ||
          c.telefone?.includes(searchCliente) ||
          c.cidade?.toLowerCase().includes(searchCliente.toLowerCase())
      ),
    [clientes, searchCliente]
  );

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!open) return null;

  const STEPS: { key: Step; label: string; num: number }[] = [
    { key: "cliente", label: "Cliente", num: 1 },
    { key: "produtos", label: "Produtos", num: 2 },
    { key: "carrinho", label: "Revisão", num: 3 },
    { key: "pagamento", label: "Pagar", num: 4 },
  ];

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0 safe-area-top">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 h-10" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5">
              <WifiOff className="w-3 h-3" /> Offline
              {pendingCount > 0 && ` (${pendingCount})`}
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-foreground">Venda Rápida</h2>
          </div>
        </div>
        {cart.length > 0 ? (
          <Button variant="ghost" size="sm" className="gap-1 -mr-2 relative h-10" onClick={() => setStep("carrinho")}>
            <ShoppingCart className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {cart.length}
            </Badge>
          </Button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* ─── Step Progress ─── */}
      <div className="flex items-center px-4 py-2 border-b shrink-0 gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors w-full justify-center py-1.5 rounded-lg
                ${i === currentStepIdx
                  ? "bg-primary text-primary-foreground"
                  : i < currentStepIdx
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                ${i === currentStepIdx
                  ? "bg-primary-foreground text-primary"
                  : i < currentStepIdx
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                {i < currentStepIdx ? "✓" : s.num}
              </span>
              <span className="hidden min-[360px]:inline">{s.label}</span>
            </button>
          </div>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ STEP 1: Cliente ═══ */}
        {step === "cliente" && (
          <div className="flex flex-col h-full">
            <div className="p-4 sticky top-0 bg-background z-10 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  className="pl-11 h-14 text-lg rounded-2xl"
                  placeholder="Buscar cliente..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 p-4 space-y-2">
              {/* Skip client */}
              <button
                type="button"
                onClick={() => {
                  setClienteId("");
                  setStep("produtos");
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 active:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Sem cliente</p>
                    <p className="text-xs text-muted-foreground">Venda sem identificação</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Client list */}
              {filteredClientes?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClienteId(c.id);
                    setStep("produtos");
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 active:bg-accent transition-colors
                    ${clienteId === c.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{c.nome?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{c.nome}</p>
                        {Number((c as any).pontos_indicacao) > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                            <Star className="w-2.5 h-2.5 text-yellow-500" /> {Number((c as any).pontos_indicacao)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.telefone || c.cidade || c.email || ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
              {searchCliente && !filteredClientes?.length && (
                <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Produtos ═══ */}
        {step === "produtos" && (
          <div className="flex flex-col h-full">
            {/* Client banner */}
            {clienteSelecionado && (
              <div className="px-4 py-2 bg-primary/5 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{clienteSelecionado.nome?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{clienteSelecionado.nome}</span>
                    {Number((clienteSelecionado as any).pontos_indicacao) > 0 && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                        <Star className="w-2.5 h-2.5 text-yellow-500" /> {Number((clienteSelecionado as any).pontos_indicacao)} pts
                      </Badge>
                    )}
                  </div>
                  {ultimaVendaItens && ultimaVendaItens.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 text-xs rounded-xl"
                      onClick={() => {
                        setCart(ultimaVendaItens);
                        setStep("carrinho");
                        toast.success("Última venda carregada!");
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Repetir
                    </Button>
                  )}
                </div>
                {/* Score badge */}
                {clienteScore && (
                  <div className={`flex items-center gap-2 text-xs mt-1.5 px-2 py-1 rounded-lg ${
                    clienteScore.classificacao === "Risco" ? "bg-destructive/10" :
                    clienteScore.classificacao === "Regular" ? "bg-yellow-500/10" :
                    clienteScore.classificacao === "Bom" ? "bg-blue-500/10" : "bg-primary/10"
                  }`}>
                    <span>{clienteScore.emoji}</span>
                    <span className={`font-semibold ${clienteScore.cor}`}>
                      Cliente {clienteScore.classificacao}
                    </span>
                    {clienteScore.classificacao === "Risco" && (
                      <span className="text-destructive text-[10px] ml-auto">⚠ Histórico de atraso</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 sticky top-0 bg-background z-10 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  className="pl-11 h-14 text-lg rounded-2xl"
                  placeholder="Buscar produto..."
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                  autoFocus
                />
              </div>
              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 px-4 pb-3 -mt-1">
                {(["todos", "produtos", "kits"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors
                      ${filterType === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {t === "todos" ? "Todos" : t === "produtos" ? "Produtos" : "Kits"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
              {searchProd.trim() || filterType !== "todos" ? (
                <div className="space-y-2">
                  {filteredProdutos?.map((p) => (
                    <QuickProductCard key={p.id} product={p} onAdd={addToCart} fmt={fmt} onDetail={setKitDetailId} />
                  ))}
                  {!filteredProdutos?.length && (
                    <p className="text-muted-foreground text-center py-12">Nenhum {filterType === "kits" ? "kit" : "produto"} encontrado</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Client products */}
                  {clienteId && produtosCliente && produtosCliente.length > 0 && (
                    <QuickScrollSection
                      title="Comprados por este cliente"
                      items={produtosCliente}
                      allProducts={produtos as any[]}
                      onAdd={addToCart}
                      fmt={fmt}
                    />
                  )}

                  {maisVendidos && maisVendidos.length > 0 && (
                    <QuickScrollSection
                      title="Mais vendidos"
                      items={maisVendidos}
                      allProducts={produtos as any[]}
                      onAdd={addToCart}
                      fmt={fmt}
                    />
                  )}

                  {recentes && recentes.length > 0 && (
                    <QuickScrollSection
                      title="Vendidos recentemente"
                      items={recentes}
                      allProducts={produtos as any[]}
                      onAdd={addToCart}
                      fmt={fmt}
                    />
                  )}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Todos os produtos</p>
                    <div className="space-y-2">
                      {(produtos as any[])?.filter((p: any) => p.ativo !== false).map((p: any) => (
                        <QuickProductCard key={p.id} product={p} onAdd={addToCart} fmt={fmt} onDetail={setKitDetailId} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Carrinho / Revisão ═══ */}
        {step === "carrinho" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-lg">Carrinho vazio</p>
                  <Button size="lg" className="h-14 px-8 text-base rounded-2xl gap-2" onClick={() => setStep("produtos")}>
                    <Plus className="w-5 h-5" /> Adicionar produtos
                  </Button>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <Card key={item.produto_id} className="p-4 rounded-2xl">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">{item.nome}</span>
                          {item.is_kit && (
                            <Badge className="text-[10px] gap-0.5 px-1.5 py-0 bg-primary/15 text-primary border-primary/30">
                              <Layers className="w-2.5 h-2.5" />Kit
                            </Badge>
                          )}
                          {item.bonus && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5">
                              <Gift className="w-2.5 h-2.5" />Bônus
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.quantidade}x {fmt(item.preco_vendido)}
                          {item.desconto > 0 && ` (desc: ${fmt(item.desconto)})`}
                        </p>
                        {/* Expandable kit composition */}
                        {item.is_kit && item.kit_itens && (
                          <button
                            type="button"
                            onClick={() => setExpandedCartKit(expandedCartKit === item.produto_id ? null : item.produto_id)}
                            className="text-xs text-primary mt-1 flex items-center gap-1"
                          >
                            <Package className="w-3 h-3" />
                            {item.kit_itens.length} {item.kit_itens.length === 1 ? "item" : "itens"}
                            <ChevronRight className={`w-3 h-3 transition-transform ${expandedCartKit === item.produto_id ? "rotate-90" : ""}`} />
                          </button>
                        )}
                        {item.is_kit && expandedCartKit === item.produto_id && item.kit_itens && (
                          <div className="mt-2 ml-1 space-y-1 border-l-2 border-primary/20 pl-3">
                            {item.kit_itens.map((ki) => {
                              const prod = (onlineProdutos as any[])?.find((p: any) => p.id === ki.produto_id);
                              return (
                                <p key={ki.produto_id} className="text-xs text-muted-foreground">
                                  {prod?.nome ?? ki.produto_id.slice(0, 8)} × {ki.quantidade * item.quantidade}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-primary text-lg">
                        {item.bonus ? "R$ 0,00" : fmt(item.subtotal)}
                      </span>
                    </div>

                    {/* Actions row - big touch targets */}
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => changeQty(idx, -1)}
                        >
                          <Minus className="w-5 h-5" />
                        </Button>
                        <span className="w-12 text-center font-bold text-xl">{item.quantidade}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => changeQty(idx, 1)}
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={item.bonus ? "default" : "outline"}
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => updateItem(idx, { bonus: !item.bonus })}
                          title="Bônus"
                        >
                          <Gift className="w-5 h-5" />
                        </Button>
                        <Button
                          type="button"
                          variant={editingItem === idx ? "default" : "outline"}
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => setEditingItem(editingItem === idx ? null : idx)}
                          title="Editar preço"
                        >
                          <DollarSign className="w-5 h-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl border-destructive/30"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Editing panel */}
                    {editingItem === idx && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Preço unitário</Label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-14 text-lg mt-1 rounded-xl"
                            value={item.preco_vendido || ""}
                            onChange={(e) =>
                              updateItem(idx, { preco_vendido: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Desconto (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-14 text-lg mt-1 rounded-xl"
                            value={item.desconto || ""}
                            placeholder="0,00"
                            onChange={(e) =>
                              updateItem(idx, { desconto: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}

              {cart.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2 text-base rounded-2xl"
                  onClick={() => setStep("produtos")}
                >
                  <Plus className="w-5 h-5" /> Adicionar mais produtos
                </Button>
              )}
            </div>

            {/* Cart summary footer */}
            {cart.length > 0 && (
              <div className="border-t p-4 bg-background space-y-3 shrink-0 safe-area-bottom">
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
                  <div className="flex justify-between font-bold text-xl">
                    <span>Total</span>
                    <span className="text-primary">{fmt(total)}</span>
                  </div>
                </div>
                {tierDesconto > 0 && cart.length > 0 && (
                  <Button variant="outline" className="w-full h-12 gap-2 rounded-2xl text-sm" onClick={applyTierDiscount}>
                    <Award className="w-5 h-5 text-primary" />
                    Aplicar desconto de nível ({tierDesconto}%)
                  </Button>
                )}
                <Button
                  className="w-full h-14 text-lg gap-2 rounded-2xl font-bold"
                  onClick={() => {
                    autoFillPagamento();
                    setStep("pagamento");
                  }}
                >
                  <CreditCard className="w-6 h-6" />
                  Ir para Pagamento
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Pagamento ═══ */}
        {step === "pagamento" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4">
              {/* Summary */}
              <Card className="p-4 rounded-2xl space-y-1 text-sm">
                <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Resumo</p>
                {clienteSelecionado && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{clienteSelecionado.nome}</span>
                  </div>
                )}
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
                <div className="flex justify-between font-bold text-xl">
                  <span>Total</span>
                  <span className="text-primary">{fmt(total)}</span>
                </div>
              </Card>

              {/* Quick payment buttons */}
              <div>
                <Label className="font-semibold text-sm">Forma de pagamento</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {FORMAS_PAGAMENTO.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => {
                        setPagamentos([{ forma: f.value, valor: total }]);
                      }}
                      className={`p-3 rounded-2xl border-2 text-center transition-colors active:scale-95
                        ${pagamentos[0]?.forma === f.value && pagamentos.length === 1
                          ? "border-primary bg-primary/5"
                          : "border-border"
                        }`}
                    >
                      <p className="text-lg">{f.label.split(" ")[0]}</p>
                      <p className="text-[11px] font-medium text-foreground mt-0.5">{f.label.split(" ").slice(1).join(" ")}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual payment adjustment */}
              <div className="space-y-2">
                {pagamentos.map((pag, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={pag.forma} onValueChange={(v) => updatePagamento(idx, "forma", v)}>
                      <SelectTrigger className="h-12 rounded-xl flex-1">
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
                      className="h-12 text-lg flex-1 rounded-xl"
                      value={pag.valor || ""}
                      onChange={(e) => updatePagamento(idx, "valor", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                      placeholder="R$ 0,00"
                    />
                    {pagamentos.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl" onClick={() => removePagamento(idx)}>
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" className="w-full h-12 gap-2 rounded-2xl" onClick={addPagamento}>
                  <Plus className="w-5 h-5" /> Dividir pagamento
                </Button>

                {!hasCrediario && troco > 0 && (
                  <Card className="p-3 rounded-2xl bg-accent/50">
                    <p className="text-center font-bold text-lg text-foreground">Troco: {fmt(troco)}</p>
                  </Card>
                )}
                {!hasCrediario && totalPago > 0 && totalPago < total && (
                  <p className="text-base font-semibold text-destructive text-center">
                    Faltam: {fmt(total - totalPago)}
                  </p>
                )}
              </div>

              {/* Crediário config */}
              {hasCrediario && (
                <CrediarioConfigPanel
                  config={crediarioConfig}
                  onChange={setCrediarioConfig}
                  total={total}
                />
              )}

              {/* Obs */}
              <Textarea
                placeholder="Observações da venda..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="rounded-xl"
                rows={2}
              />
            </div>

            {/* Finalizar footer */}
            <div className="border-t p-4 bg-background shrink-0 safe-area-bottom">
              {!isOnline && (
                <p className="text-xs text-center text-muted-foreground mb-2 flex items-center justify-center gap-1">
                  <WifiOff className="w-3 h-3" /> Venda será salva localmente
                </p>
              )}
              <Button
                className="w-full h-16 text-xl gap-3 rounded-2xl font-bold"
                disabled={isSubmitting || finalizar.isPending || finalizingRef.current || cart.length === 0 || (!hasCrediario && totalPago < total) || (hasCrediario && !clienteId)}
                onClick={handleFinalizar}
              >
                <Check className="w-7 h-7" />
                {isSubmitting || finalizar.isPending || finalizingRef.current
                  ? (finalizingStep || "Finalizando...")
                  : `Finalizar ${fmt(total)}`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom floating cart button (on produtos step) ─── */}
      {step === "produtos" && cart.length > 0 && (
        <div className="border-t p-4 bg-background shrink-0 safe-area-bottom">
          <Button
            className="w-full h-14 text-lg gap-2 rounded-2xl font-bold"
            onClick={() => setStep("carrinho")}
          >
            <ShoppingCart className="w-6 h-6" />
            Ver Carrinho ({cart.length}) — {fmt(total)}
          </Button>
        </div>
      )}

      {/* ─── Kit Detail Modal ─── */}
      {kitDetailData && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setKitDetailId(null)}>
          <div
            className="bg-background w-full max-w-lg rounded-t-3xl p-6 space-y-4 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                  <Layers className="w-3 h-3" /> Kit
                </Badge>
                <h3 className="font-bold text-lg text-foreground">{kitDetailData.nome}</h3>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setKitDetailId(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            {kitDetailData.imagem_url && (
              <img src={kitDetailData.imagem_url} alt={kitDetailData.nome} className="w-full h-40 object-cover rounded-2xl" />
            )}
            {kitDetailData.descricao && (
              <p className="text-sm text-muted-foreground">{kitDetailData.descricao}</p>
            )}
            <p className="text-2xl font-bold text-primary">{fmt(Number(kitDetailData.preco))}</p>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Composição do kit</p>
              <div className="space-y-2">
                {(kitDetailData as any).kit_itens?.map((ki: any) => (
                  <div key={ki.produto_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      {ki.produtos?.imagem_url ? (
                        <img src={ki.produtos.imagem_url} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-foreground">{ki.produtos?.nome ?? "Produto"}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">×{Number(ki.quantidade)}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="w-full h-14 text-lg gap-2 rounded-2xl font-bold"
              onClick={() => {
                const kitProduct = kitsAsProducts.find((k: any) => k._kit_id === kitDetailData.id);
                if (kitProduct) addToCart(kitProduct);
                setKitDetailId(null);
              }}
            >
              <Plus className="w-6 h-6" /> Adicionar ao carrinho
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───

function QuickProductCard({ product, onAdd, fmt, onDetail }: { product: any; onAdd: (p: any) => void; fmt: (v: number) => string; onDetail?: (id: string) => void }) {
  const kitItemCount = product.is_kit ? product.kit_itens?.length ?? 0 : 0;
  return (
    <div className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-card transition-all ${product.is_kit ? "border-primary/30" : "border-border"}`}>
      <button
        type="button"
        onClick={() => {
          if (product.is_kit && onDetail) {
            onDetail(product._kit_id);
          } else {
            onAdd(product);
          }
        }}
        className="flex items-center gap-3 text-left flex-1 active:opacity-70"
      >
        {product.imagem_url ? (
          <img src={product.imagem_url} alt={product.nome} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${product.is_kit ? "bg-primary/10" : "bg-muted"}`}>
            {product.is_kit ? <Layers className="w-5 h-5 text-primary" /> : <Package className="w-5 h-5 text-muted-foreground" />}
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-foreground text-base">{product.nome}</p>
            {product.is_kit && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30 gap-0.5">
                <Layers className="w-2.5 h-2.5" /> Kit
              </Badge>
            )}
          </div>
          {product.codigo && <p className="text-xs text-muted-foreground mt-0.5">{product.codigo}</p>}
          {product.is_kit && kitItemCount > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Contém {kitItemCount} {kitItemCount === 1 ? "item" : "itens"}
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="font-bold text-primary text-lg">{fmt(Number(product.preco))}</span>
        <button
          type="button"
          onClick={() => onAdd(product)}
          className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}

function QuickScrollSection({ title, items, allProducts, onAdd, fmt }: {
  title: string;
  items: { produto_id: string; nome: string }[];
  allProducts: any[];
  onAdd: (p: any) => void;
  fmt: (v: number) => string;
}) {
  if (!allProducts?.length) return null;
  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const resolved = items
    .map((i) => productMap.get(i.produto_id))
    .filter((p): p is any => !!p && p.ativo !== false);
  if (!resolved.length) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {resolved.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onAdd(p)}
            className="shrink-0 w-36 p-4 rounded-2xl border-2 border-border bg-card active:bg-accent active:scale-95 transition-all text-left snap-start"
          >
            <p className="font-semibold text-foreground text-sm truncate">{p.nome}</p>
            <p className="font-bold text-primary text-base mt-1">{fmt(Number(p.preco))}</p>
            <div className="mt-2 w-full h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
