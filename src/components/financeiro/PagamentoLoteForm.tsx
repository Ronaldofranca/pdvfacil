import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, CircleDot, Clock } from "lucide-react";
import { useRegistrarPagamentoLote } from "@/hooks/useParcelas";
import { distribuirPagamento } from "@/lib/distribuirPagamento";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FORMAS = [
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
  parcelas: any[]; // parcelas selecionadas (com saldo > 0)
  onSuccess?: () => void;
}

export function PagamentoLoteForm({ open, onOpenChange, parcelas, onSuccess }: Props) {
  const { profile, user } = useAuth();
  const registrar = useRegistrarPagamentoLote();

  const saldoTotal = useMemo(
    () => parcelas.reduce((s, p) => s + Number(p.saldo ?? 0), 0),
    [parcelas]
  );

  const [valor, setValor] = useState(saldoTotal.toFixed(2));
  const [forma, setForma] = useState("pix");
  const [obs, setObs] = useState("");

  const valorNum = Math.max(0, parseFloat(valor) || 0);

  const preview = useMemo(() => {
    if (!parcelas.length || valorNum <= 0) return null;
    const parcelasInput = parcelas.map((p) => ({
      id: p.id,
      vencimento: p.vencimento,
      saldo: Number(p.saldo),
      status: p.status,
    }));
    return distribuirPagamento(parcelasInput, valorNum);
  }, [parcelas, valorNum]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const temExcesso = (preview?.sobra ?? 0) > 0;

  const statusIcon = (s: string) => {
    if (s === "paga") return <CheckCircle className="w-3 h-3 text-emerald-600" />;
    if (s === "parcial") return <CircleDot className="w-3 h-3 text-amber-500" />;
    return <Clock className="w-3 h-3 text-muted-foreground" />;
  };

  const handleSubmit = () => {
    if (!profile || !user || !parcelas.length || valorNum <= 0 || temExcesso) return;
    registrar.mutate(
      {
        empresa_id: profile.empresa_id,
        parcelas: parcelas.map((p) => ({
          id: p.id,
          vencimento: p.vencimento,
          saldo: Number(p.saldo),
          status: p.status,
        })),
        valor_recebido: valorNum,
        forma_pagamento: forma,
        usuario_id: user.id,
        observacoes: obs,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  // Recalcular saldoTotal quando as parcelas mudam (e resetar o valor)
  const calcSaldoTotal = parcelas.reduce((s, p) => s + Number(p.saldo ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamento Distribuído</DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Parcelas</p>
            <p className="text-lg font-bold">{parcelas.length}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Saldo Total</p>
            <p className="text-lg font-bold text-destructive">{fmt(calcSaldoTotal)}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Já Pago</p>
            <p className="text-lg font-bold text-primary">
              {fmt(parcelas.reduce((s, p) => s + Number(p.valor_pago ?? 0), 0))}
            </p>
          </div>
        </div>

        <Separator />

        {/* Campos do pagamento */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Valor Recebido (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                setValor(isNaN(v) ? "0.00" : v.toFixed(2));
              }}
              className={temExcesso ? "border-destructive" : ""}
            />
            {temExcesso && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Excesso de {fmt(preview?.sobra ?? 0)} — reduza o valor.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Forma de Pagamento *</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
        </div>

        <Separator />

        {/* Prévia da distribuição */}
        {preview && valorNum > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Prévia da Distribuição</p>
            <p className="text-xs text-muted-foreground">
              Ordem: menor vencimento primeiro.
            </p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2">Parcela</th>
                    <th className="text-left px-3 py-2">Vencimento</th>
                    <th className="text-right px-3 py-2">Saldo</th>
                    <th className="text-right px-3 py-2">Será Aplicado</th>
                    <th className="text-center px-3 py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.entradas.map((e, i) => {
                    const parcela = parcelas.find((p) => p.id === e.id);
                    return (
                      <tr key={e.id} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                        <td className="px-3 py-2 font-medium">
                          {parcela?.numero ?? i + 1}ª
                          <span className="block text-muted-foreground font-normal truncate max-w-[80px]">
                            {(parcela as any)?.clientes?.nome}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {format(new Date(e.vencimento + "T12:00:00"), "dd/MM/yy", { locale: ptBR })}
                        </td>
                        <td className="px-3 py-2 text-right">{fmt(e.saldo)}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {e.valorAplicado > 0 ? (
                            <span className="text-primary">{fmt(e.valorAplicado)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {statusIcon(e.valorAplicado > 0 ? e.statusApos : e.statusAtual)}
                            <span className="capitalize">
                              {e.valorAplicado > 0
                                ? e.statusApos === "paga"
                                  ? "Paga"
                                  : "Parcial"
                                : "Sem alteração"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-xs">
                      Total Aplicado:
                    </td>
                    <td className="px-3 py-2 text-right text-primary">
                      {fmt(preview.totalAplicado)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={registrar.isPending || valorNum <= 0 || temExcesso || !preview}
          >
            {registrar.isPending ? "Salvando..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
