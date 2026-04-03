import { forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { fmtR } from "@/lib/reportExport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getReceiptConfig } from "@/lib/receiptConfig";

interface ReceiptCreditoContentProps {
  devolucao: any;
  cliente: any;
  valorCredito: number;
  empresa?: any;
  config?: any;
}

export const ReceiptCreditoContent = forwardRef<HTMLDivElement, ReceiptCreditoContentProps>(
  ({ devolucao, cliente, valorCredito, empresa, config }, ref) => {
    const rc = getReceiptConfig(config);

    const devId = devolucao?.id?.slice(0, 8) ?? "—";
    const clienteNome = cliente?.nome ?? "Cliente";
    const dataCredito = new Date();

    return (
      <div
        ref={ref}
        data-receipt-document="credito"
        className="bg-white p-6"
        style={{
          color: rc.recibo_cor_texto,
          fontSize: `${rc.recibo_tamanho_fonte_labels}px`,
          maxWidth: "400px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          {empresa?.logo_url && (
            <img src={empresa.logo_url} alt={empresa.nome} className="h-12 mx-auto mb-2 object-contain" />
          )}
          <h1 className="text-xl font-bold uppercase tracking-tight" style={{ color: rc.recibo_cor_principal }}>
            {valorCredito > 0 ? "Recibo de Crédito" : "Comprovante de Devolução"}
          </h1>
          <p className="text-sm font-medium">{empresa?.nome ?? "VendaForce"}</p>
          {empresa?.telefone && <p className="text-xs text-muted-foreground">{empresa.telefone}</p>}
        </div>

        <Separator className="my-4" />

        {/* Cliente e Info */}
        <div className="space-y-1.5 mb-6">
          <div className="flex justify-between text-xs">
            <span className="font-semibold uppercase text-muted-foreground">Cliente</span>
            <span className="font-bold">{clienteNome}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-semibold uppercase text-muted-foreground">ID Devolução</span>
            <span className="font-mono">{devId}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-semibold uppercase text-muted-foreground">Data/Hora</span>
            <span>{format(dataCredito, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
          </div>
        </div>

        {/* Valor Central */}
        <div 
          className="text-center py-6 rounded-xl border-2 border-dashed mb-6"
          style={{ borderColor: rc.recibo_cor_principal + "44", backgroundColor: rc.recibo_cor_principal + "08" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Valor do Crédito Gerado</p>
          <h2 className="text-3xl font-black" style={{ color: rc.recibo_cor_principal }}>
            {fmtR(valorCredito)}
          </h2>
        </div>

        {/* Itens Devolvidos */}
        {devolucao?.itens_devolucao && devolucao.itens_devolucao.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Itens Devolvidos</p>
            <div className="space-y-1">
              {devolucao.itens_devolucao.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[10px] gap-2">
                  <span className="truncate flex-1">{item.produtos?.nome || item.produto?.nome || "Produto"}</span>
                  <span className="font-bold whitespace-nowrap">
                    {Number(item.quantidade)} x {fmtR(Number(item.valor_unitario))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-[11px] font-black border-t pt-1 mt-1">
                <span>TOTAL BRUTO</span>
                <span>{fmtR(Number(devolucao.valor_total_devolvido || 0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé informativo */}
        <div className="space-y-3">
          <p className="text-[10px] leading-relaxed text-center text-muted-foreground italic">
            Este crédito é nominal e intransferível, podendo ser utilizado como forma de pagamento ("Crédito Casa") em suas próximas compras em nossa loja.
          </p>
          
          <Separator />
          
          <div className="flex flex-col items-center gap-1">
            <div className="w-32 h-[1px] bg-foreground/20 mt-8 mb-1" />
            <span className="text-[9px] uppercase font-medium">Assinatura Responsável</span>
          </div>
        </div>

        <div className="mt-8 pt-4 text-center border-t border-dashed">
          <p className="text-[8px] text-muted-foreground">Comprovante gerado via PDV Fácil - Sistema de Gestão</p>
        </div>
      </div>
    );
  }
);

ReceiptCreditoContent.displayName = "ReceiptCreditoContent";
