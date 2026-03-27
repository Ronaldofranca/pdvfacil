import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { useVendaItens } from "@/hooks/useVendas";
import { useParcelas } from "@/hooks/useParcelas";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { exportReceiptFromElement } from "@/lib/reportExport";
import { ReceiptDialogShell } from "@/components/receipts/ReceiptDialogShell";
import { ReceiptVendaContent } from "@/components/receipts/ReceiptVendaContent";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda: any;
}

export function ReciboVenda({ open, onOpenChange, venda }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { data: itens, isLoading: itensLoading, isFetching: itensFetching } = useVendaItens(venda?.id ?? null);
  const { data: parcelas, isLoading: parcelasLoading, isFetching: parcelasFetching } = useParcelas(venda?.id ? { vendaId: venda.id } : undefined);
  const { data: empresas, isLoading: empresasLoading } = useEmpresas();
  const { data: config, isLoading: configLoading } = useConfiguracoes();
  const empresa = empresas?.[0];
  const vendaId = venda?.id?.slice(0, 8) ?? "";
  const clienteNome = (venda as any)?.clientes?.nome ?? "Consumidor";
  const fileName = `recibo_venda_${vendaId}.pdf`;
  const loadingReceipt = itensLoading || itensFetching || parcelasLoading || parcelasFetching || empresasLoading || configLoading;

  useEffect(() => {
    if (!open || !venda) return;
    console.info("[Receipt] início da montagem do recibo de venda", { vendaId: venda.id });
  }, [open, venda]);

  useEffect(() => {
    if (!open || !venda || loadingReceipt) return;
    console.info("[Receipt] dados carregados para recibo de venda", {
      vendaId: venda.id,
      itens: itens?.length ?? 0,
      parcelas: parcelas?.length ?? 0,
      empresa: empresa?.id ?? null,
    });
  }, [open, venda, loadingReceipt, itens, parcelas, empresa]);

  if (!venda) return null;

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
      await exportReceiptFromElement(contentRef.current, fileName, action, (venda as any).clientes?.telefone, {
        type: "venda",
        id: vendaId,
        cliente: { nome: clienteNome, id: venda.cliente_id?.slice(0, 8) ?? "—" },
        resumo: {
          subtotal: Number(venda.subtotal ?? 0),
          descontos: Number(venda.desconto_total ?? 0),
          total: Number(venda.total ?? 0),
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
      title={undefined}
      actions={actions}
    >
      <ReceiptVendaContent 
        ref={contentRef} 
        venda={venda} 
        itens={itens} 
        parcelas={parcelas} 
        empresa={empresa} 
        config={config}
      />
    </ReceiptDialogShell>
  );
}
