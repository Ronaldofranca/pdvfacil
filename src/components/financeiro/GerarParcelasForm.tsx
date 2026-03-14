import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Trash2, Package } from "lucide-react";
import { useGerarParcelas, type ParcelaGerarInput } from "@/hooks/useParcelas";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";

const FORMAS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "crediario", label: "Crediário" },
];

interface SelectedItem {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId?: string;
  clienteId?: string;
  valorSugerido?: number;
}

export function GerarParcelasForm({ open, onOpenChange, vendaId, clienteId, valorSugerido }: Props) {
  const { profile } = useAuth();
  const { data: clientes } = useClientes();
  const { data: produtos } = useProdutos();
  const gerar = useGerarParcelas();

  const [form, setForm] = useState({
    cliente_id: clienteId ?? "",
    valor_total: valorSugerido ? String(valorSugerido) : "",
    num_parcelas: "1",
    primeiro_vencimento: new Date().toISOString().split("T")[0],
    forma_pagamento: "boleto",
    descricao: "",
  });

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [prodSearch, setProdSearch] = useState("");
  const [useManualValue, setUseManualValue] = useState(!valorSugerido ? false : true);

  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  // Auto-sum from selected items
  const itemsTotal = useMemo(
    () => selectedItems.reduce((s, i) => s + i.preco * i.quantidade, 0),
    [selectedItems]
  );

  const effectiveTotal = selectedItems.length > 0 ? itemsTotal : (parseFloat(form.valor_total) || 0);
  const valorParcela = effectiveTotal / (parseInt(form.num_parcelas) || 1);
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Product search
  const filteredProdutos = useMemo(() => {
    if (!produtos || !prodSearch.trim()) return [];
    const q = prodSearch.toLowerCase();
    return produtos
      .filter((p: any) => p.ativo && (p.nome.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [produtos, prodSearch]);

  const addItem = (prod: any) => {
    const existing = selectedItems.find((i) => i.produto_id === prod.id);
    if (existing) {
      setSelectedItems((prev) =>
        prev.map((i) => (i.produto_id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i))
      );
    } else {
      setSelectedItems((prev) => [
        ...prev,
        { produto_id: prod.id, nome: prod.nome, preco: Number(prod.preco), quantidade: 1 },
      ]);
    }
    setProdSearch("");
  };

  const updateItemQty = (prodId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedItems((prev) => prev.filter((i) => i.produto_id !== prodId));
    } else {
      setSelectedItems((prev) =>
        prev.map((i) => (i.produto_id === prodId ? { ...i, quantidade: qty } : i))
      );
    }
  };

  const removeItem = (prodId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.produto_id !== prodId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const total = selectedItems.length > 0 ? itemsTotal : parseFloat(form.valor_total) || 0;
    if (total <= 0) return;

    const descParts: string[] = [];
    if (form.descricao) descParts.push(form.descricao);
    if (selectedItems.length > 0) {
      descParts.push("Itens: " + selectedItems.map((i) => `${i.nome} (${i.quantidade}x)`).join(", "));
    }

    const input: ParcelaGerarInput = {
      empresa_id: profile.empresa_id,
      venda_id: vendaId,
      cliente_id: form.cliente_id || undefined,
      valor_total: total,
      num_parcelas: parseInt(form.num_parcelas) || 1,
      primeiro_vencimento: form.primeiro_vencimento,
      forma_pagamento: form.forma_pagamento,
    };
    gerar.mutate(input, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedItems([]);
        setProdSearch("");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Parcelas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          {!clienteId && (
            <div>
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={(v) => set("cliente_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Product Selection */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4" /> Selecionar Itens (opcional)
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar produto por nome ou código..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
              />
            </div>
            {filteredProdutos.length > 0 && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                {filteredProdutos.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted text-sm text-left"
                    onClick={() => addItem(p)}
                  >
                    <span className="truncate">{p.nome}</span>
                    <span className="text-muted-foreground ml-2 whitespace-nowrap">{fmt(Number(p.preco))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Itens selecionados</Label>
              {selectedItems.map((item) => (
                <div key={item.produto_id} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <span className="flex-1 truncate font-medium">{item.nome}</span>
                  <Input
                    type="number"
                    min="1"
                    className="w-16 h-8 text-center text-xs"
                    value={item.quantidade}
                    onChange={(e) => updateItemQty(item.produto_id, parseInt(e.target.value) || 0)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">× {fmt(item.preco)}</span>
                  <span className="font-semibold text-sm whitespace-nowrap">{fmt(item.preco * item.quantidade)}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeItem(item.produto_id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm text-muted-foreground">Total dos itens:</span>
                <span className="text-base font-bold text-primary">{fmt(itemsTotal)}</span>
              </div>
              <Separator />
            </div>
          )}

          {/* Manual value (only if no items selected) */}
          {selectedItems.length === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Total (R$) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={form.valor_total}
                  onChange={(e) => set("valor_total", e.target.value)}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    set("valor_total", isNaN(v) ? "0.00" : v.toFixed(2));
                  }}
                />
              </div>
              <div />
            </div>
          )}

          {/* Parcelas config */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nº Parcelas *</Label>
              <Input required type="number" min="1" max="48" value={form.num_parcelas} onChange={(e) => set("num_parcelas", e.target.value)} />
            </div>
            <div>
              <Label>1º Vencimento *</Label>
              <Input required type="date" value={form.primeiro_vencimento} onChange={(e) => set("primeiro_vencimento", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Forma Pagamento</Label>
            <Select value={form.forma_pagamento} onValueChange={(v) => set("forma_pagamento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição / Referência (opcional)</Label>
            <Input
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Ex: Compra de produtos, serviço prestado..."
            />
          </div>

          {/* Preview */}
          {effectiveTotal > 0 && parseInt(form.num_parcelas) > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{form.num_parcelas}x</span> de{" "}
                <span className="font-semibold text-primary">{fmt(valorParcela)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total: {fmt(effectiveTotal)}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={gerar.isPending || effectiveTotal <= 0}>
              {gerar.isPending ? "Gerando..." : "Gerar Parcelas"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
