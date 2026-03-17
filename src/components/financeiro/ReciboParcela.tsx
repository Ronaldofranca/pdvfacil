import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { usePagamentosDaParcela, useParcelas } from "@/hooks/useParcelas";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportReceiptPDF, printReceipt, shareReceiptWhatsApp, fmtR } from "@/lib/reportExport";
import { getReceiptConfig } from "@/lib/receiptConfig";
import { ReceiptDialogShell } from "@/components/receipts/ReceiptDialogShell";
import { toast } from "sonner";

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

  const runReceiptAction = async (action: () => Promise<unknown>, loadingText: string, successText?: string) => {
    const id = toast.loading(loadingText);
    try {
      await action();
      toast.dismiss(id);
      if (successText) toast.success(successText);
    } catch (error) {
      toast.dismiss(id);
      toast.error(error instanceof Error ? error.message : "Falha ao gerar o recibo.");
    }
  };

  const actions = (
    <>
      <Button variant="outline" className="w-full gap-1.5" onClick={() => runReceiptAction(() => exportReceiptPDF(buildReceiptOptions()), "Gerando PDF...", "PDF do recibo gerado.")}>
        <FileDown className="w-4 h-4" /> Exportar PDF
      </Button>
      <Button variant="outline" className="w-full gap-1.5" onClick={() => runReceiptAction(() => printReceipt(buildReceiptOptions()), "Preparando impressão...")}>
        <Printer className="w-4 h-4" /> Imprimir
      </Button>
      <Button variant="outline" className="w-full gap-1.5" onClick={() => runReceiptAction(() => shareReceiptWhatsApp(buildReceiptOptions(), (parcela as any).clientes?.telefone), "Preparando compartilhamento...")}>
        <MessageCircle className="w-4 h-4" /> WhatsApp
      </Button>
    </>
  );

  return (
    <ReceiptDialogShell open={open} onOpenChange={onOpenChange} title={<>Recibo — Parcela {parcela.numero}ª</>} actions={actions}>
      <div className="space-y-4 text-sm sm:space-y-5">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-center">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Valor Original</p>
              <p className="text-sm font-bold">{fmtR(Number(parcela.valor_total))}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Saldo Anterior</p>
              <p className="text-sm font-bold">{fmtR(saldoAnterior)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-center">
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
                    <p className="font-medium break-words">{p.numero}ª — {fmtR(Number(p.valor_total))}</p>
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
    </ReceiptDialogShell>
  );
}
