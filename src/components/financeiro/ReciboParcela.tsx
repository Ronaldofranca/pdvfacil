import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { usePagamentosDaParcela, useParcelas } from "@/hooks/useParcelas";
import { exportReceiptFromElement } from "@/lib/reportExport";
import { ReceiptDialogShell } from "@/components/receipts/ReceiptDialogShell";
import { ReceiptParcelaContent } from "@/components/receipts/ReceiptParcelaContent";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: any;
}

export function ReciboParcela({ open, onOpenChange, parcela }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { data: pagamentos, isLoading: pagamentosLoading, isFetching: pagamentosFetching } = usePagamentosDaParcela(parcela?.id ?? null);

  const parcelasFilter = parcela?.venda_id
    ? { vendaId: parcela.venda_id }
    : parcela?.cliente_id
      ? { clienteId: parcela.cliente_id }
      : undefined;
  const { data: todasParcelas, isLoading: parcelasLoading, isFetching: parcelasFetching } = useParcelas(parcelasFilter);

  const clienteNome = (parcela as any)?.clientes?.nome ?? "Cliente não identificado";
  const ultimoPagamento = pagamentos?.[0];
  const valorPagoAntes = parcela
    ? ultimoPagamento
      ? Number(parcela.valor_pago) - Number(ultimoPagamento.valor_pago)
      : Number(parcela.valor_pago)
    : 0;
  const saldoAnterior = parcela ? Number(parcela.valor_total) - Math.max(0, valorPagoAntes) : 0;

  const parcelasRestantes = parcela
    ? todasParcelas?.filter(
        (p) => p.id !== parcela.id && (p.status === "pendente" || p.status === "parcial" || p.status === "vencida")
      )
    : undefined;

  const fileName = `recibo_pagamento_${parcela?.id?.slice(0, 8) ?? ""}.pdf`;
  const loadingReceipt = pagamentosLoading || pagamentosFetching || parcelasLoading || parcelasFetching;

  useEffect(() => {
    if (!open || !parcela) return;
    console.info("[Receipt] início da montagem do recibo de pagamento", { parcelaId: parcela.id });
  }, [open, parcela]);

  useEffect(() => {
    if (!open || !parcela || loadingReceipt) return;
    console.info("[Receipt] dados carregados para recibo de pagamento", {
      parcelaId: parcela.id,
      pagamentos: pagamentos?.length ?? 0,
      parcelasRestantes: parcelasRestantes?.length ?? 0,
    });
  }, [open, parcela, loadingReceipt, pagamentos, parcelasRestantes]);

  if (!parcela) return null;

  const runAction = async (action: "download" | "print" | "share", loadingText: string, successText?: string) => {
    if (loadingReceipt) {
      toast.error("Aguarde o recibo terminar de carregar.");
      return;
    }

    if (!contentRef.current) {
      toast.error("O recibo ainda não está pronto.");
      return;
    }

    const id = toast.loading(loadingText);
    try {
      await exportReceiptFromElement(contentRef.current, fileName, action, (parcela as any).clientes?.telefone, {
        type: "pagamento",
        id: parcela.id.slice(0, 8),
        cliente: { nome: clienteNome, id: parcela.cliente_id?.slice(0, 8) ?? "—" },
      });
      toast.dismiss(id);
      if (successText) toast.success(successText);
    } catch (error) {
      toast.dismiss(id);
      toast.error(error instanceof Error ? error.message : "Falha ao gerar o recibo.");
    }
  };

  const actions = (
    <>
      <Button variant="outline" className="w-full gap-1.5" disabled={loadingReceipt} onClick={() => runAction("download", "Gerando PDF...", "PDF do recibo gerado.")}>
        <FileDown className="h-4 w-4" /> Exportar PDF
      </Button>
      <Button variant="outline" className="w-full gap-1.5" disabled={loadingReceipt} onClick={() => runAction("print", "Preparando impressão...")}>
        <Printer className="h-4 w-4" /> Imprimir
      </Button>
      <Button variant="outline" className="w-full gap-1.5" disabled={loadingReceipt} onClick={() => runAction("share", "Preparando compartilhamento...")}>
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </Button>
    </>
  );

  return (
    <ReceiptDialogShell open={open} onOpenChange={onOpenChange} title={undefined} actions={actions} exportRef={exportRef}>
      <ReceiptParcelaContent
        parcela={parcela}
        pagamentos={pagamentos}
        parcelasRestantes={parcelasRestantes}
        saldoAnterior={saldoAnterior}
      />
    </ReceiptDialogShell>
  );
}
