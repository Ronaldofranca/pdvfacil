import { forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { fmtR } from "@/lib/reportExport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Parcialmente Paga",
  paga: "Paga",
  vencida: "Vencida",
};

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  crediario: "Crediário",
  boleto: "Boleto",
  transferencia: "Transferência",
  outro: "Outro",
};

interface ReceiptParcelaContentProps {
  parcela: any;
  pagamentos: any[] | undefined;
  parcelasRestantes: any[] | undefined;
  saldoAnterior: number;
}

export const ReceiptParcelaContent = forwardRef<HTMLDivElement, ReceiptParcelaContentProps>(
  ({ parcela, pagamentos, parcelasRestantes, saldoAnterior }, ref) => {
    if (!parcela) return null;

    const clienteNome = (parcela as any).clientes?.nome ?? "Cliente não identificado";
    const vendaId = parcela.venda_id ? `#${parcela.venda_id.slice(0, 8)}` : "—";

    return (
      <div ref={ref} data-receipt-document="pagamento" className="space-y-4 bg-background text-sm sm:space-y-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Recibo de Pagamento</p>
              <h2 className="text-xl font-semibold text-foreground">Parcela {parcela.numero}ª</h2>
              <p className="text-xs text-muted-foreground">Venda vinculada: {vendaId}</p>
            </div>
            <Badge variant={parcela.status === "paga" ? "default" : parcela.status === "vencida" ? "destructive" : parcela.status === "parcial" ? "outline" : "secondary"}>
              {STATUS_LABELS[parcela.status] ?? parcela.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium text-right">{clienteNome}</span>
          </div>
          {parcela.cliente_id && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Cód. Cliente</span>
              <span className="font-mono text-xs">{parcela.cliente_id.slice(0, 8)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Venda</span>
            <span className="font-medium">{vendaId}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vencimento</span>
            <span className="font-medium text-right">{format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={parcela.status === "paga" ? "default" : parcela.status === "vencida" ? "destructive" : parcela.status === "parcial" ? "outline" : "secondary"}>
              {STATUS_LABELS[parcela.status] ?? parcela.status}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-semibold">Resumo Financeiro</p>
          <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Valor Original</p>
              <p className="text-sm font-bold">{fmtR(Number(parcela.valor_total))}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Saldo Anterior</p>
              <p className="text-sm font-bold">{fmtR(saldoAnterior)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-2">
            <div className="rounded-lg bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">Pago</p>
              <p className="text-sm font-bold text-primary">{fmtR(Number(parcela.valor_pago))}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs text-muted-foreground">Saldo Restante</p>
              <p className="text-sm font-bold text-destructive">{fmtR(Number(parcela.saldo))}</p>
            </div>
          </div>
        </div>

        {pagamentos && pagamentos.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold">Histórico de Pagamentos</p>
              {pagamentos.map((pg) => (
                <div key={pg.id} className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{fmtR(Number(pg.valor_pago))}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(pg.data_pagamento), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{FORMA_LABELS[pg.forma_pagamento] ?? pg.forma_pagamento.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          </>
        )}

        {parcelasRestantes && parcelasRestantes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold">Parcelas Restantes</p>
              {parcelasRestantes.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{p.numero}ª — {fmtR(Number(p.valor_total))}</p>
                    <p className="text-xs text-muted-foreground">Venc: {format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}</p>
                  </div>
                  <Badge variant={p.status === "vencida" ? "destructive" : p.status === "parcial" ? "outline" : "secondary"} className="text-xs">
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
);

ReceiptParcelaContent.displayName = "ReceiptParcelaContent";
