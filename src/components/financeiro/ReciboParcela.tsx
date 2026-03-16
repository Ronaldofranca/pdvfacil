import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { usePagamentosDaParcela, useParcelas } from "@/hooks/useParcelas";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportReceiptPDF, shareReceiptWhatsApp, fmtR } from "@/lib/reportExport";
import { getReceiptConfig } from "@/lib/receiptConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: any;
}

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

export function ReciboParcela({ open, onOpenChange, parcela }: Props) {
  const { data: pagamentos } = usePagamentosDaParcela(parcela?.id ?? null);
  const { data: empresas } = useEmpresas();
  const { data: config } = useConfiguracoes();
  const empresa = empresas?.[0];
  
  const parcelasFilter = parcela?.venda_id
    ? { vendaId: parcela.venda_id }
    : parcela?.cliente_id
      ? { clienteId: parcela.cliente_id }
      : undefined;
  const { data: todasParcelas } = useParcelas(parcelasFilter);

  if (!parcela) return null;

  const clienteNome = (parcela as any).clientes?.nome ?? "Cliente não identificado";
  const vendaId = parcela.venda_id ? `#${parcela.venda_id.slice(0, 8)}` : "—";

  const ultimoPagamento = pagamentos?.[0];
  const valorPagoAntes = ultimoPagamento
    ? Number(parcela.valor_pago) - Number(ultimoPagamento.valor_pago)
    : Number(parcela.valor_pago);
  const saldoAnterior = Number(parcela.valor_total) - Math.max(0, valorPagoAntes);

  const parcelasRestantes = todasParcelas?.filter(
    (p) => p.id !== parcela.id && (p.status === "pendente" || p.status === "parcial" || p.status === "vencida")
  );

  const buildReceiptOptions = () => {
    const rc = getReceiptConfig(config);
    const pagamentosList = pagamentos?.map((pg) => ({
      forma: FORMA_LABELS[pg.forma_pagamento] ?? pg.forma_pagamento.replace(/_/g, " "),
      valor: Number(pg.valor_pago),
      data: format(new Date(pg.data_pagamento), "dd/MM/yyyy HH:mm"),
    })) ?? [];

    const saldoRestante = Number(parcela.saldo);
    const pixConfig = config?.pix_chave && config?.pix_tipo && saldoRestante > 0
      ? { chave: config.pix_chave, tipo: config.pix_tipo, valor: saldoRestante, nome_recebedor: (config as any)?.pix_nome_recebedor || undefined, cidade_recebedor: (config as any)?.pix_cidade_recebedor || undefined }
      : undefined;

    return {
      type: "pagamento" as const,
      id: parcela.id.slice(0, 8),
      empresa: empresa?.nome ?? "Empresa",
      logoUrl: empresa?.logo_url ?? undefined,
      data: ultimoPagamento
        ? format(new Date(ultimoPagamento.data_pagamento), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : format(new Date(), "dd/MM/yyyy HH:mm"),
      cliente: {
        nome: clienteNome,
        id: parcela.cliente_id?.slice(0, 8) ?? "—",
      },
      itens: [],
      resumo: {
        subtotal: Number(parcela.valor_total),
        descontos: 0,
        total: Number(parcela.valor_total),
      },
      pagamentos: pagamentosList.map((p) => ({ forma: p.forma, valor: p.valor, data: p.data })),
      parcelaInfo: {
        numero: parcela.numero,
        vencimento: format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy"),
        valorTotal: Number(parcela.valor_total),
        valorPago: Number(parcela.valor_pago),
        saldoAnterior,
        saldoRestante,
        status: STATUS_LABELS[parcela.status] ?? parcela.status,
        vendaId: parcela.venda_id?.slice(0, 8) ?? "—",
      },
      parcelasRestantes: parcelasRestantes?.map((p) => ({
        numero: p.numero,
        valor: Number(p.valor_total),
        vencimento: format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy"),
        status: STATUS_LABELS[p.status] ?? p.status,
      })),
      empresaInfo: {
        telefone: empresa?.telefone || undefined,
        endereco: empresa?.endereco || undefined,
        cnpj: empresa?.cnpj || undefined,
      },
      pix: pixConfig,
      receiptConfig: rc,
    };
  };

  const handleExportPDF = async () => {
    await exportReceiptPDF(buildReceiptOptions());
  };

  const handleShare = async () => {
    const clientePhone = (parcela as any).clientes?.telefone;
    await shareReceiptWhatsApp(buildReceiptOptions(), clientePhone);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            {parcela.cliente_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cód. Cliente</span>
                <span className="font-mono text-xs">{parcela.cliente_id.slice(0, 8)}</span>
              </div>
            )}
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
              <Badge variant={
                parcela.status === "paga" ? "default" :
                parcela.status === "vencida" ? "destructive" :
                parcela.status === "parcial" ? "outline" : "secondary"
              }>
                {STATUS_LABELS[parcela.status] ?? parcela.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Financial summary with valor original */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Resumo Financeiro</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Valor Original</p>
                <p className="text-sm font-bold">{fmtR(Number(parcela.valor_total))}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Saldo Anterior</p>
                <p className="text-sm font-bold">{fmtR(saldoAnterior)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
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

          {/* Payment history */}
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
                      {FORMA_LABELS[pg.forma_pagamento] ?? pg.forma_pagamento.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Remaining parcelas */}
          {parcelasRestantes && parcelasRestantes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Parcelas Restantes</p>
                {parcelasRestantes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div>
                      <p className="font-medium">{p.numero}ª — {fmtR(Number(p.valor_total))}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc: {format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant={
                      p.status === "vencida" ? "destructive" :
                      p.status === "parcial" ? "outline" : "secondary"
                    } className="text-xs">
                      {STATUS_LABELS[p.status] ?? p.status}
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
            <Button variant="outline" className="gap-1.5" onClick={handleShare}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
