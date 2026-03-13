import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGerarParcelas, type ParcelaGerarInput } from "@/hooks/useParcelas";
import { useClientes } from "@/hooks/useClientes";
import { useAuth } from "@/contexts/AuthContext";

const FORMAS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

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
  const gerar = useGerarParcelas();

  const [form, setForm] = useState({
    cliente_id: clienteId ?? "",
    valor_total: valorSugerido ? String(valorSugerido) : "",
    num_parcelas: "1",
    primeiro_vencimento: new Date().toISOString().split("T")[0],
    forma_pagamento: "boleto",
    descricao: "",
  });

  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  const valorParcela = (parseFloat(form.valor_total) || 0) / (parseInt(form.num_parcelas) || 1);
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const input: ParcelaGerarInput = {
      empresa_id: profile.empresa_id,
      venda_id: vendaId,
      cliente_id: form.cliente_id || undefined,
      valor_total: parseFloat(form.valor_total) || 0,
      num_parcelas: parseInt(form.num_parcelas) || 1,
      primeiro_vencimento: form.primeiro_vencimento,
      forma_pagamento: form.forma_pagamento,
    };
    gerar.mutate(input, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Parcelas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor Total (R$) *</Label>
              <Input required type="number" step="0.01" value={form.valor_total} onChange={(e) => set("valor_total", e.target.value)} onBlur={(e) => { const v = parseFloat(e.target.value); set("valor_total", isNaN(v) ? "0.00" : v.toFixed(2)); }} />
            </div>
            <div>
              <Label>Nº Parcelas *</Label>
              <Input required type="number" min="1" max="48" value={form.num_parcelas} onChange={(e) => set("num_parcelas", e.target.value)} />
            </div>
            <div>
              <Label>1º Vencimento *</Label>
              <Input required type="date" value={form.primeiro_vencimento} onChange={(e) => set("primeiro_vencimento", e.target.value)} />
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
          </div>
          {/* Descrição opcional */}
          <div>
            <Label>Descrição / Referência (opcional)</Label>
            <Input
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Ex: Compra de produtos, serviço prestado..."
            />
          </div>
          {parseFloat(form.valor_total) > 0 && parseInt(form.num_parcelas) > 0 && (
            <p className="text-sm text-muted-foreground">
              {form.num_parcelas}x de <span className="font-semibold text-foreground">{fmt(valorParcela)}</span>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={gerar.isPending}>{gerar.isPending ? "Gerando..." : "Gerar Parcelas"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
