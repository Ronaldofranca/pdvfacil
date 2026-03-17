import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { usePagamentosDaParcela, useParcelas } from "@/hooks/useParcelas";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  const ultimoPagamento = pagamentos?.[0];
  const valorPagoAntes = ultimoPagamento
    ? Number(parcela.valor_pago) - Number(ultimoPagamento.valor_pago)
    : Number(parcela.valor_pago);
  const saldoAnterior = Number(parcela.valor_total) - Math.max(0, valorPagoAntes);

  const parcelasRestantes = todasParcelas?.filter(
    (p) => p.id !== parcela.id && (p.status === "pendente" || p.status === "parcial" || p.status === "vencida")
  );

  const fileName = `recibo_pagamento_${parcela.id.slice(0, 8)}.pdf`;

  const captureOptions = {
    type: "pagamento" as const,
    id: parcela.id.slice(0, 8),
    empresa: empresa?.nome ?? "Empresa",
    data: ultimoPagamento
      ? format(new Date(ultimoPagamento.data_pagamento), "dd/MM/yyyy HH:mm", { locale: ptBR })
      : format(new Date(), "dd/MM/yyyy HH:mm"),
    cliente: { nome: clienteNome, id: parcela.cliente_id?.slice(0, 8) ?? "—" },
    itens: [],
    resumo: { subtotal: Number(parcela.valor_total), descontos: 0, total: Number(parcela.valor_total) },
    pagamentos: [],
  };

  const runAction = async (action: "download" | "print" | "share", loadingText: string, successText?: string) => {
    if (!contentRef.current) {
      toast.error("O recibo ainda não está pronto.");
      return;
    }
    const id = toast.loading(loadingText);
    try {
      await exportReceiptFromElement(
        contentRef.current,
        fileName,
        action,
        (parcela as any).clientes?.telefone,
        captureOptions
      );
      toast.dismiss(id);
      if (successText) toast.success(successText);
    } catch (error) {
      toast.dismiss(id);
      toast.error(error instanceof Error ? error.message : "Falha ao gerar o recibo.");
    }
  };

  const actions = (
    <>
      <Button variant="outline" className="w-full gap-1.5" onClick={() => runAction("download", "Gerando PDF...", "PDF do recibo gerado.")}>
        <FileDown className="w-4 h-4" /> Exportar PDF
      </Button>
      <Button variant="outline" className="w-full gap-1.5" onClick={() => runAction("print", "Preparando impressão...")}>
        <Printer className="w-4 h-4" /> Imprimir
      </Button>
      <Button variant="outline" className="w-full gap-1.5" onClick={() => runAction("share", "Preparando compartilhamento...")}>
        <MessageCircle className="w-4 h-4" /> WhatsApp
      </Button>
    </>
  );

  return (
    <ReceiptDialogShell open={open} onOpenChange={onOpenChange} title={<>Recibo — Parcela {parcela.numero}ª</>} actions={actions}>
      <ReceiptParcelaContent
        ref={contentRef}
        parcela={parcela}
        pagamentos={pagamentos}
        parcelasRestantes={parcelasRestantes}
        saldoAnterior={saldoAnterior}
      />
    </ReceiptDialogShell>
  );
}
