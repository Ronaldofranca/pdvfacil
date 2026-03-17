import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { useVendaItens } from "@/hooks/useVendas";
import { useParcelas } from "@/hooks/useParcelas";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportReceiptFromElement, fmtR } from "@/lib/reportExport";
import { ReceiptDialogShell } from "@/components/receipts/ReceiptDialogShell";
import { ReceiptVendaContent } from "@/components/receipts/ReceiptVendaContent";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda: any;
}

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  crediario: "Crediário / Fiado",
  boleto: "Boleto",
  transferencia: "Transferência",
  outro: "Outro",
};

const PARCELA_STATUS: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  paga: "Paga",
  vencida: "Vencida",
};

export function ReciboVenda({ open, onOpenChange, venda }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { data: itens } = useVendaItens(venda?.id ?? null);
  const { data: parcelas } = useParcelas(venda?.id ? { vendaId: venda.id } : undefined);
  const { data: empresas } = useEmpresas();
  const { data: config } = useConfiguracoes();
  const empresa = empresas?.[0];

  if (!venda) return null;

  const vendaId = venda.id.slice(0, 8);
  const clienteNome = (venda as any).clientes?.nome ?? "Consumidor";
  const pagamentos = Array.isArray(venda.pagamentos) ? (venda.pagamentos as any[]) : [];
  const fileName = `recibo_venda_${vendaId}.pdf`;

  const captureOptions = {
    type: "venda" as const,
    id: vendaId,
    empresa: empresa?.nome ?? "Empresa",
    data: format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    cliente: { nome: clienteNome, id: venda.cliente_id?.slice(0, 8) ?? "—" },
    itens: [],
    resumo: { subtotal: Number(venda.subtotal), descontos: Number(venda.desconto_total), total: Number(venda.total) },
    pagamentos: pagamentos.map((p: any) => ({ forma: FORMA_LABELS[p.forma] ?? p.forma, valor: p.valor })),
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
        (venda as any).clientes?.telefone,
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
    <ReceiptDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={<>{venda.status === "cancelada" ? "Comprovante de Cancelamento" : "Recibo de Venda"} #{vendaId}</>}
      actions={actions}
    >
      <ReceiptVendaContent ref={contentRef} venda={venda} itens={itens} parcelas={parcelas} />
    </ReceiptDialogShell>
  );
}
