import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileDown, Printer, MessageCircle } from "lucide-react";
import { useVendaItens } from "@/hooks/useVendas";
import { useParcelas } from "@/hooks/useParcelas";
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
  venda: any;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  pendente: "Pendente",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

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
  const { data: itens } = useVendaItens(venda?.id ?? null);
  const { data: parcelas } = useParcelas(venda?.id ? { vendaId: venda.id } : undefined);
  const { data: empresas } = useEmpresas();
  const { data: config } = useConfiguracoes();
  const empresa = empresas?.[0];

  if (!venda) return null;

  const clienteNome = (venda as any).clientes?.nome ?? "Consumidor";
  const vendaId = venda.id.slice(0, 8);
  const dataVenda = new Date(venda.data_venda);
  const pagamentos = Array.isArray(venda.pagamentos) ? (venda.pagamentos as any[]) : [];
  const hasCrediario = pagamentos.some((p: any) => p.forma === "crediario");

  const buildReceiptOptions = () => {
    const hasPixPayment = pagamentos.some((p: any) => p.forma === "pix");
    const rc = getReceiptConfig(config);
    const pixConfig = config?.pix_chave && config?.pix_tipo
      ? {
          chave: config.pix_chave,
          tipo: config.pix_tipo,
          valor: hasCrediario
            ? parcelas?.reduce((s, p) => s + (p.status !== "paga" ? Number(p.valor_total) - Number(p.valor_pago) : 0), 0) || Number(venda.total)
            : hasPixPayment ? undefined : Number(venda.total),
        }
      : undefined;

    return {
      type: "venda" as const,
      id: vendaId,
      empresa: empresa?.nome ?? "Empresa",
      logoUrl: empresa?.logo_url ?? undefined,
      data: format(dataVenda, "dd/MM/yyyy HH:mm", { locale: ptBR }),
      cliente: {
        nome: clienteNome,
        id: venda.cliente_id?.slice(0, 8) ?? "—",
      },
      itens: itens?.map((item) => ({
        nome: item.nome_produto,
        quantidade: Number(item.quantidade),
        precoUnitario: Number(item.preco_vendido),
        desconto: Number(item.desconto),
        subtotal: Number(item.subtotal),
        bonus: item.bonus,
        imagemUrl: (item as any).produtos?.imagem_url || undefined,
      })) ?? [],
      resumo: {
        subtotal: Number(venda.subtotal),
        descontos: Number(venda.desconto_total),
        total: Number(venda.total),
      },
      pagamentos: pagamentos.map((p: any) => ({
        forma: FORMA_LABELS[p.forma] ?? p.forma,
        valor: p.valor,
      })),
      parcelas: hasCrediario && parcelas?.length ? parcelas.map((p) => ({
        numero: p.numero,
        valor: Number(p.valor_total),
        vencimento: format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy"),
        status: PARCELA_STATUS[p.status] ?? p.status,
      })) : undefined,
      empresaInfo: {
        telefone: empresa?.telefone || undefined,
        endereco: empresa?.endereco || undefined,
        cnpj: empresa?.cnpj || undefined,
      },
      pix: pixConfig,
      receiptConfig: rc,
      cancelamento: venda.status === "cancelada" ? {
        motivo: (venda as any).motivo_cancelamento ?? "Não informado",
        data: (venda as any).cancelado_em ? format(new Date((venda as any).cancelado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : undefined,
      } : undefined,
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
      <Button variant="outline" className="w-full gap-1.5" onClick={() => runReceiptAction(() => shareReceiptWhatsApp(buildReceiptOptions(), (venda as any).clientes?.telefone), "Preparando compartilhamento...")}>
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
      <div className="space-y-4 text-sm sm:space-y-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium text-right">{clienteNome}</span>
          </div>
          {venda.cliente_id && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Cód. Cliente</span>
              <span className="font-mono text-xs">{venda.cliente_id.slice(0, 8)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Data</span>
            <span className="font-medium text-right">{format(dataVenda, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={venda.status === "finalizada" ? "default" : venda.status === "cancelada" ? "destructive" : "secondary"}>
              {STATUS_LABELS[venda.status] ?? venda.status}
            </Badge>
          </div>
        </div>

        {venda.status === "cancelada" && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm space-y-1">
            <p className="font-semibold text-destructive">Venda Cancelada</p>
            {(venda as any).motivo_cancelamento && <p className="text-muted-foreground break-words">Motivo: {(venda as any).motivo_cancelamento}</p>}
            {(venda as any).cancelado_em && (
              <p className="text-xs text-muted-foreground">Cancelada em: {format(new Date((venda as any).cancelado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            )}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Itens da Venda</p>
          {itens?.map((item) => (
            <div key={item.id} className="rounded border p-2 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-xs text-muted-foreground">
                  <img
                    src={(item as any).produtos?.imagem_url || "/placeholder.svg"}
                    alt={item.nome_produto}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium">{item.nome_produto}</p>
                    {(item as any).item_type === "kit" && <Badge variant="outline" className="px-1 py-0 text-[10px]">Kit</Badge>}
                  </div>
                  <p className="break-words text-xs text-muted-foreground">
                    {Number(item.quantidade)}x {fmtR(Number(item.preco_vendido))}
                    {item.bonus && " (Bônus)"}
                    {Number(item.desconto) > 0 && ` — Desc: ${fmtR(Number(item.desconto))}`}
                  </p>
                </div>
                <span className="whitespace-nowrap font-medium">{fmtR(Number(item.subtotal))}</span>
              </div>
              {(item as any)._kit_composicao?.length > 0 && (
                <div className="ml-13 mt-1.5 space-y-0.5 border-l-2 border-muted pl-3">
                  {(item as any)._kit_composicao.map((comp: any, idx: number) => (
                    <p key={idx} className="text-[11px] text-muted-foreground">• {comp.quantidade}x {comp.produto_nome}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmtR(Number(venda.subtotal))}</span>
          </div>
          {Number(venda.desconto_total) > 0 && (
            <div className="flex justify-between gap-4 text-destructive">
              <span>Descontos</span>
              <span>-{fmtR(Number(venda.desconto_total))}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{fmtR(Number(venda.total))}</span>
          </div>
        </div>

        <Separator />

        {pagamentos.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Formas de Pagamento</p>
            {pagamentos.map((p: any, i: number) => (
              <div key={i} className="flex justify-between gap-4 rounded border p-2 text-sm">
                <span className="capitalize break-words">{FORMA_LABELS[p.forma] ?? p.forma}</span>
                <span className="font-medium whitespace-nowrap">{fmtR(p.valor)}</span>
              </div>
            ))}
          </div>
        )}

        {hasCrediario && parcelas && parcelas.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold">Parcelas do Crediário</p>
              {parcelas.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{p.numero}ª Parcela — {fmtR(Number(p.valor_total))}</p>
                    <p className="text-xs text-muted-foreground">Venc: {format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}</p>
                  </div>
                  <Badge variant={p.status === "paga" ? "default" : p.status === "vencida" ? "destructive" : p.status === "parcial" ? "outline" : "secondary"} className="text-xs">
                    {PARCELA_STATUS[p.status] ?? p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}

        {venda.observacoes && (
          <>
            <Separator />
            <div className="text-sm">
              <p className="mb-1 font-semibold">Observações</p>
              <p className="break-words text-muted-foreground">{venda.observacoes}</p>
            </div>
          </>
        )}
      </div>
    </ReceiptDialogShell>
  );
}
