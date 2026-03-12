import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileDown, Printer } from "lucide-react";
import { usePagamentosDaParcela } from "@/hooks/useParcelas";
import { useEmpresas } from "@/hooks/useEmpresas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportPDF, fmtR } from "@/lib/reportExport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: any;
}

export function ReciboParcela({ open, onOpenChange, parcela }: Props) {
  const { data: pagamentos } = usePagamentosDaParcela(parcela?.id ?? null);
  const { data: empresas } = useEmpresas();
  const empresaNome = empresas?.[0]?.nome ?? "Empresa";

  if (!parcela) return null;

  const clienteNome = (parcela as any).clientes?.nome ?? "Cliente não identificado";
  const vendaId = parcela.venda_id ? `#${parcela.venda_id.slice(0, 8)}` : "—";

  const handleExportPDF = () => {
    const rows: string[][] = [];
    
    rows.push(["Cliente", clienteNome]);
    rows.push(["Venda", vendaId]);
    rows.push(["Parcela", `${parcela.numero}ª`]);
    rows.push(["Vencimento", format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy")]);
    rows.push(["---", "---"]);
    rows.push(["Valor Total", fmtR(Number(parcela.valor_total))]);
    rows.push(["Valor Pago", fmtR(Number(parcela.valor_pago))]);
    rows.push(["Saldo Restante", fmtR(Number(parcela.saldo))]);
    rows.push(["Status", parcela.status.toUpperCase()]);

    if (pagamentos?.length) {
      rows.push(["---", "---"]);
      rows.push(["PAGAMENTOS", ""]);
      pagamentos.forEach((pg) => {
        rows.push([
          format(new Date(pg.data_pagamento), "dd/MM/yyyy HH:mm"),
          `${fmtR(Number(pg.valor_pago))} (${pg.forma_pagamento.replace(/_/g, " ")})`,
        ]);
      });
    }

    exportPDF({
      title: `Recibo - Parcela ${parcela.numero}ª`,
      periodo: format(new Date(), "dd/MM/yyyy"),
      empresa: empresaNome,
      headers: ["Campo", "Valor"],
      rows,
    });
  };

  const STATUS_LABELS: Record<string, string> = {
    pendente: "Pendente",
    paga: "Paga",
    vencida: "Vencida",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Recibo — Parcela {parcela.numero}ª
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{clienteNome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venda</span>
              <span className="font-medium">{vendaId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimento</span>
              <span className="font-medium">
                {format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={parcela.status === "paga" ? "default" : parcela.status === "vencida" ? "destructive" : "secondary"}>
                {STATUS_LABELS[parcela.status] ?? parcela.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Valores */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold">{fmtR(Number(parcela.valor_total))}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Pago</p>
              <p className="text-sm font-bold text-primary">{fmtR(Number(parcela.valor_pago))}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className="text-sm font-bold text-destructive">{fmtR(Number(parcela.saldo))}</p>
            </div>
          </div>

          {/* Pagamentos */}
          {pagamentos && pagamentos.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Histórico de Pagamentos</p>
                {pagamentos.map((pg) => (
                  <div key={pg.id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div>
                      <p className="font-medium">{fmtR(Number(pg.valor_pago))}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pg.data_pagamento), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {pg.forma_pagamento.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1.5" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
