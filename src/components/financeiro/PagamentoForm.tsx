import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegistrarPagamento } from "@/hooks/useParcelas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: any;
}

export function PagamentoForm({ open, onOpenChange, parcela }: Props) {
  const registrar = useRegistrarPagamento();
  const saldo = Number(parcela?.saldo ?? 0);
  const [valor, setValor] = useState(String(saldo));

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcela) return;
    registrar.mutate(
      { id: parcela.id, valor: parseFloat(valor) || 0 },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Parcela {parcela?.numero} — Saldo: <span className="font-semibold text-foreground">{fmt(saldo)}</span>
          </p>
          <div>
            <Label>Valor do Pagamento (R$) *</Label>
            <Input required type="number" step="0.01" max={saldo} value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={registrar.isPending}>{registrar.isPending ? "Salvando..." : "Confirmar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
