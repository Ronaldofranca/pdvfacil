import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { usePedidoItens } from "@/hooks/usePedidos";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { exportReceiptFromElement } from "@/lib/reportExport";
import { ReceiptDialogShell } from "@/components/receipts/ReceiptDialogShell";
import { ReceiptPedidoContent } from "@/components/receipts/ReceiptPedidoContent";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: any;
}

export function ReciboPedido({ open, onOpenChange, pedido }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { data: itens, isLoading: itensLoading } = usePedidoItens(pedido?.id ?? null);
  const { data: empresas, isLoading: empresasLoading } = useEmpresas();
  const { data: config, isLoading: configLoading } = useConfiguracoes();
  
  const empresa = empresas?.[0];
  const pedidoIdShort = pedido?.id?.slice(0, 8) ?? "";
  const clienteNome = (pedido as any)?.clientes?.nome ?? "Cliente";
  const fileName = `recibo_pedido_${pedidoIdShort}.pdf`;
  const loadingReceipt = itensLoading || empresasLoading || configLoading;

  const runAction = async (action: "download" | "print" | "share", loadingText: string, successText?: string) => {
    if (loadingReceipt) {
      toast.error("Aguarde o carregamento do pedido.");
      return;
    }

    if (!contentRef.current) {
      toast.error("O recibo ainda não está pronto.");
      return;
    }

    const id = toast.loading(loadingText);
    try {
      await exportReceiptFromElement(contentRef.current, fileName, action, (pedido as any).clientes?.telefone, {
        type: "pedido",
        id: pedidoIdShort,
        cliente: { nome: clienteNome, id: pedido.cliente_id?.slice(0, 8) ?? "—" },
        resumo: {
          subtotal: Number(pedido.subtotal ?? 0),
          descontos: Number(pedido.desconto_total ?? 0),
          total: Number(pedido.valor_total ?? 0),
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
      <Button variant="outline" className="w-full gap-1.5" disabled={loadingReceipt} onClick={() => runAction("download", "Gerando PDF...", "PDF do pedido gerado.")}>
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
      title="Recibo do Pedido"
      actions={actions}
    >
      <ReceiptPedidoContent 
        ref={contentRef} 
        pedido={pedido} 
        itens={itens} 
        empresa={empresa} 
        config={config}
      />
    </ReceiptDialogShell>
  );
}
