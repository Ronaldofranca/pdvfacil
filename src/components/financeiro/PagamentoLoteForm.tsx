import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, CircleDot, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRegistrarPagamentoLote } from "@/hooks/useParcelas";
import { distribuirPagamento, type ParcelaParaDistribuir } from "@/lib/distribuirPagamento";
import { useAuth } from "@/contexts/AuthContext";

// ─── Constantes ──────────────────────────────────────────────────────────────

const FORMAS = [
  { value: "dinheiro",         label: "Dinheiro" },
  { value: "pix",              label: "PIX" },
  { value: "cartao_credito",   label: "Cartão Crédito" },
  { value: "cartao_debito",    label: "Cartão Débito" },
  { value: "boleto",           label: "Boleto" },
  { value: "transferencia",    label: "Transferência" },
];

const STATUS_CFG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente",  variant: "secondary",    icon: Clock },
  parcial:  { label: "Parcial",   variant: "outline",      icon: CircleDot },
  paga:     { label: "Paga",      variant: "default",      icon: CheckCircle },
  vencida:  { label: "Vencida",   variant: "destructive",  icon: AlertTriangle },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parcelas já ordenadas por vencimento (passadas por Financeiro.tsx). */
  parcelas: any[];
  /** Chamado após confirmação bem-sucedida (para limpar a seleção). */
  onSuccess?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// ─── Componente ──────────────────────────────────────────────────────────────

export function PagamentoLoteForm({ open, onOpenChange, parcelas, onSuccess }: Props) {
  const { profile, user } = useAuth();
  const registrarLote = useRegistrarPagamentoLote();

  // Saldo total das parcelas selecionadas
  const saldoTotal = parcelas?.reduce((s, p) => s + Number(p.saldo), 0) || 0;

  // Estado do formulário
  const [valor, setValor] = useState(saldoTotal.toFixed(2));
  const [forma, setForma] = useState("pix");
  const [obs, setObs] = useState("");
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  // Sincroniza o valor padrão quando as parcelas mudam (ex: ao abrir novamente)
  const [lastSaldo, setLastSaldo] = useState(saldoTotal);
  if (saldoTotal !== lastSaldo) {
    setLastSaldo(saldoTotal);
    setValor(saldoTotal.toFixed(2));
  }

  // Converte parcelas completas para o formato da função pura
  const parcelasInput: ParcelaParaDistribuir[] = useMemo(
    () =>
      (parcelas || []).map((p) => ({
        id: p.id,
        vencimento: p.vencimento,
        saldo: Number(p.saldo),
        status: p.status,
      })),
    [parcelas],
  );

  // Prévia de distribuição em tempo real
  const valorNum = parseFloat(valor) || 0;
  const preview = useMemo(
    () => distribuirPagamento(parcelasInput, valorNum),
    [parcelasInput, valorNum],
  );

  const sobra = preview.sobra;
  const temSobra = sobra > 0.005;
  const valorValido = valorNum > 0 && parcelasInput.length > 0;

  // Helper: convert datetime-local string to ISO WITH local timezone offset
  function toLocalIso(localDateStr: string): string {
    const d = new Date(localDateStr);
    const offsetMs = d.getTimezoneOffset() * 60 * 1000;
    const localMs = d.getTime() - offsetMs;
    const localDate = new Date(localMs);
    const sign = d.getTimezoneOffset() <= 0 ? "+" : "-";
    const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
    const offsetH = pad(Math.floor(Math.abs(d.getTimezoneOffset()) / 60));
    const offsetM = pad(Math.abs(d.getTimezoneOffset()) % 60);
    return localDate.toISOString().slice(0, 19) + `${sign}${offsetH}:${offsetM}`;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || !valorValido) return;

    registrarLote.mutate(
      {
        empresa_id: profile.empresa_id,
        parcelas: parcelasInput,
        valor_recebido: valorNum,
        forma_pagamento: forma,
        usuario_id: user.id,
        observacoes: obs,
        data_pagamento: toLocalIso(dataPagamento),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setValor("");
          setObs("");
          onSuccess?.();
        },
      },
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!parcelas || parcelas.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Recebimento Distribuído
          </DialogTitle>
        </DialogHeader>

        {/* ── Resumo das parcelas selecionadas ── */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
          <div className="rounded-lg bg-muted p-1.5 sm:p-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Parcelas</p>
            <p className="text-sm font-bold">{parcelas.length}</p>
          </div>
          <div className="rounded-lg bg-muted p-1.5 sm:p-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Saldo total</p>
            <p className="text-sm font-bold text-destructive">{fmt(saldoTotal)}</p>
          </div>
          <div className="rounded-lg bg-muted p-1.5 sm:p-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Aplicado</p>
            <p className="text-sm font-bold text-primary">{fmt(preview.totalAplicado)}</p>
          </div>
        </div>

        {/* ── Alerta de sobra ── */}
        {temSobra && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              O valor informado é maior que o saldo das parcelas selecionadas.
              A sobra de <strong>{fmt(sobra)}</strong> não será alocada.
            </span>
          </div>
        )}

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Valor recebido (R$) *</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  setValor(isNaN(v) ? "0.00" : v.toFixed(2));
                }}
              />
            </div>
            <div>
              <Label>Forma *</Label>
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
          <div>
            <Label>Data do Pagamento *</Label>
            <Input 
              required 
              type="datetime-local" 
              value={dataPagamento} 
              max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setDataPagamento(e.target.value)} 
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              placeholder="Ex: Pagamento parcial referente ao mês de março"
            />
          </div>

          <Separator />

          {/* ── Prévia da distribuição ── */}
          <div>
            <p className="text-sm font-semibold mb-2">Prévia da distribuição</p>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Parcela</th>
                    <th className="text-left px-3 py-2 font-medium">Vencimento</th>
                    <th className="text-right px-3 py-2 font-medium">Saldo</th>
                    <th className="text-right px-3 py-2 font-medium">Aplicado</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.entradas.map((entrada, idx) => {
                    const parcela = parcelas.find((p) => p.id === entrada.id);
                    const cfg = STATUS_CFG[entrada.statusApos] ?? STATUS_CFG.pendente;
                    const StatusIcon = cfg.icon;
                    const isAfetada = entrada.valorAplicado > 0;
                    return (
                      <tr
                        key={entrada.id}
                        className={[
                          "border-t",
                          isAfetada ? "bg-primary/5" : "opacity-60",
                        ].join(" ")}
                      >
                        <td className="px-3 py-2 font-medium">
                          {parcela?.numero ?? idx + 1}ª
                          <span className="ml-1 text-muted-foreground truncate max-w-[80px] block">
                            {parcela?.clientes?.nome ?? ""}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {format(new Date(entrada.vencimento + "T12:00:00"), "dd/MM/yy", { locale: ptBR })}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {fmt(entrada.saldo)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {isAfetada ? (
                            <span className="text-primary">{fmt(entrada.valorAplicado)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={cfg.variant} className="gap-1 text-xs">
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50 font-semibold text-xs">
                    <td className="px-3 py-2" colSpan={3}>
                      Total aplicado
                    </td>
                    <td className="px-3 py-2 text-right text-primary">
                      {fmt(preview.totalAplicado)}
                    </td>
                    <td />
                  </tr>
                  {temSobra && (
                    <tr className="border-t text-xs text-amber-700 dark:text-amber-400">
                      <td className="px-3 py-2" colSpan={3}>
                        Sobra não alocada
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(sobra)}</td>
                      <td />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={registrarLote.isPending || !valorValido}>
              {registrarLote.isPending ? "Registrando..." : "Confirmar Recebimento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
