import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { exportReceiptFromElement } from "@/lib/reportExport";
import { ReceiptDialogShell } from "@/components/receipts/ReceiptDialogShell";
import { ReceiptCreditoContent } from "@/components/receipts/ReceiptCreditoContent";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devolucao: any;
  cliente: any;
  valorCredito: number;
}

export function ReciboCredito({ open, onOpenChange, devolucao, cliente, valorCredito }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { data: empresas, isLoading: empresasLoading } = useEmpresas();
  const { data: config, isLoading: configLoading } = useConfiguracoes();
  const empresa = empresas?.[0];
  const devId = devolucao?.id?.slice(0, 8) ?? "";
  const clienteNome = cliente?.nome ?? "Cliente";
  const fileName = `recibo_credito_${devId}.pdf`;
  const loadingReceipt = empresasLoading || configLoading;

  const runAction = async (action: "download" | "print" | "share", loadingText: string, successText?: string) => {
    if (!contentRef.current) {
      toast.error("O recibo ainda não está pronto.");
      return;
    }

    const id = toast.loading(loadingText);
    try {
      await exportReceiptFromElement(contentRef.current, fileName, action, cliente?.telefone, {
        type: "credito",
        id: devId,
        cliente: { nome: clienteNome, id: cliente?.id?.slice(0, 8) ?? "—" },
        resumo: {
          total: Number(valorCredito ?? 0),
        },
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
    <ReceiptDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Comprovante de Crédito"
      actions={actions}
    >
      <ReceiptCreditoContent 
        ref={contentRef} 
        devolucao={devolucao}
        cliente={cliente}
        valorCredito={valorCredito}
        empresa={empresa} 
        config={config}
      />
    </ReceiptDialogShell>
  );
}
