import { forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { fmtR } from "@/lib/reportExport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getReceiptConfig } from "@/lib/receiptConfig";

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

interface ReceiptParcelaContentProps {
  parcela: any;
  pagamentos: any[] | undefined;
  parcelasRestantes: any[] | undefined;
  saldoAnterior: number;
  config?: any;
  empresa?: any;
}

export const ReceiptParcelaContent = forwardRef<HTMLDivElement, ReceiptParcelaContentProps>(
  ({ parcela, pagamentos, parcelasRestantes, saldoAnterior, config, empresa }, ref) => {
    if (!parcela) return null;

    const rc = getReceiptConfig(config);

    const StatusBadge = ({ status }: { status: string }) => {
      const label = STATUS_LABELS[status] ?? status;
      const isPaga = status === "paga";
      const isVencida = status === "vencida";
      const isParcial = status === "parcial";
      
      return (
        <Badge
          style={{ 
            backgroundColor: isPaga ? rc.recibo_cor_principal : isVencida ? "#ef4444" : isParcial ? "#fef9c3" : "#f1f5f9",
            color: isPaga ? "#ffffff" : isVencida ? "#ffffff" : isParcial ? "#854d0e" : "#64748b",
            borderColor: isParcial ? "#eab308" : "transparent"
          }}
          className="pt-[2px] pb-[4px] px-3 text-[10px] items-center justify-center whitespace-nowrap overflow-visible font-bold uppercase tracking-wider"
        >
          <span>{label}</span>
        </Badge>
      );
    };

    const clienteNome = (parcela as any).clientes?.nome ?? "Cliente não identificado";
    const vendaId = parcela.venda_id ? `#${parcela.venda_id.slice(0, 8)}` : "—";
    const dataEmissao = new Date();

    return (
      <div 
        ref={ref} 
        data-receipt-document="pagamento" 
        className="bg-white"
        style={{ 
          color: rc.recibo_cor_texto,
          fontSize: `${rc.recibo_tamanho_fonte_labels}px`
        }}
      >
        {/* Company Header */}
        <div 
          className="flex justify-between gap-4 items-start"
          style={{ 
            background: `linear-gradient(135deg, ${rc.recibo_cor_cabecalho} 0%, ${rc.recibo_cor_cabecalho}dd 100%)`,
            color: rc.recibo_cor_fonte_cabecalho,
            padding: `${rc.recibo_altura_cabecalho}px 20px`,
            border: rc.recibo_borda_cabecalho ? `1px solid ${rc.recibo_cor_bordas}` : 'none'
          }}
        >
          <div className="flex items-center gap-3">
            {rc.recibo_exibir_logo && empresa?.logo_url && (
              <img
                src={empresa.logo_url}
                alt={empresa.nome}
                className="object-contain mb-2"
                style={{ width: `${rc.recibo_logo_largura}px`, maxHeight: '120px' }}
                crossOrigin="anonymous"
              />
            )}
            <div>
              <p className="font-bold leading-tight" style={{ fontSize: `${rc.recibo_tamanho_fonte_empresa}px` }}>
                {empresa?.nome || "Minha Empresa"}
              </p>
              {rc.recibo_subtitulo && (
                <p className="opacity-80 font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_titulo}px` }}>
                  {rc.recibo_subtitulo}
                </p>
              )}
              {rc.recibo_exibir_telefone && empresa?.telefone && (
                <p className="opacity-75 mt-0.5" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>
                  📞 {empresa.telefone}
                </p>
              )}
              {rc.recibo_exibir_endereco && empresa?.endereco && (
                <p className="opacity-75 truncate max-w-[180px]" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>
                  📍 {empresa.endereco}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wider font-bold mb-1" style={{ color: rc.recibo_cor_principal, fontSize: `${rc.recibo_tamanho_fonte_titulo}px` }}>
              Recibo de Pagamento
            </p>
            <p className="font-bold leading-tight" style={{ fontSize: `${rc.recibo_tamanho_fonte_venda_id}px` }}>Parcela {parcela.numero}ª</p>
            <p className="opacity-75" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>
              {format(dataEmissao, "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
            <p className="text-[8px] opacity-30 mt-1">V2.1</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Parcela details */}
          <div 
            className="p-3 rounded-lg"
            style={{ 
              border: rc.recibo_borda_dados_venda ? `1px solid ${rc.recibo_cor_bordas}` : 'none',
              background: rc.recibo_borda_dados_venda ? 'transparent' : `${rc.recibo_cor_bordas}11`
            }}
          >
            <p 
              className="uppercase font-bold tracking-wider mb-2 pb-1" 
              style={{ 
                color: rc.recibo_cor_titulos, 
                borderBottom: `2px solid ${rc.recibo_cor_bordas}`,
                fontSize: `${rc.recibo_tamanho_fonte_titulo}px`
              }}
            >
              <span className="inline-block w-[3px] h-[12px] rounded mr-1.5 align-middle" style={{ background: rc.recibo_cor_principal }} /> 
              Dados do Pagamento
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Cliente</span>
                <span className="font-semibold text-right" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{clienteNome}</span>
              </div>
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Venda Vinculada</span>
                <span className="font-semibold" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{vendaId}</span>
              </div>
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Vencimento</span>
                <span className="font-semibold" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Status</span>
                <StatusBadge status={parcela.status} />
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div
            className="p-3 rounded-lg"
            style={{ 
              border: rc.recibo_borda_pagamento ? `1px solid ${rc.recibo_cor_bordas}` : 'none'
            }}
          >
            <p 
              className="uppercase font-bold tracking-wider mb-2 pb-1" 
              style={{ 
                color: rc.recibo_cor_titulos, 
                borderBottom: `2px solid ${rc.recibo_cor_bordas}`,
                fontSize: `${rc.recibo_tamanho_fonte_titulo}px`
              }}
            >
              <span className="inline-block w-[3px] h-[12px] rounded mr-1.5 align-middle" style={{ background: rc.recibo_cor_principal }} /> 
              Resumo Financeiro
            </p>
            <div className="rounded-xl p-4 space-y-3 shadow-sm" style={{ background: `${rc.recibo_cor_principal}08`, border: `1px solid ${rc.recibo_cor_principal}22` }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground uppercase font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Valor Original</p>
                  <p className="font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_nome}px` }}>{fmtR(Number(parcela.valor_total))}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-muted-foreground uppercase font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Saldo Anterior</p>
                  <p className="font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_nome}px` }}>{fmtR(saldoAnterior)}</p>
                </div>
              </div>
              <Separator style={{ background: `${rc.recibo_cor_principal}44` }} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5">
                   <p className="text-primary uppercase font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Valor Pago</p>
                  <p className="font-bold text-primary" style={{ fontSize: `${rc.recibo_tamanho_fonte_total}px` }}>{fmtR(Number(parcela.valor_pago))}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-destructive uppercase font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Saldo Restante</p>
                  <p className="font-bold text-destructive" style={{ color: rc.recibo_cor_total, fontSize: `${rc.recibo_tamanho_fonte_total}px` }}>{fmtR(Number(parcela.saldo))}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment history */}
          {pagamentos && pagamentos.length > 0 && (
            <div
               className="p-3 rounded-lg"
               style={{ border: rc.recibo_borda_parcelas ? `1px solid ${rc.recibo_cor_bordas}` : 'none' }}
            >
              <p 
                className="uppercase font-bold tracking-wider mb-2 pb-1" 
                style={{ 
                  color: rc.recibo_cor_titulos, 
                  borderBottom: `2px solid ${rc.recibo_cor_bordas}`,
                  fontSize: `${rc.recibo_tamanho_fonte_titulo}px`
                }}
              >
                <span className="inline-block w-[3px] h-[12px] rounded mr-1.5 align-middle" style={{ background: rc.recibo_cor_principal }} /> 
                Histórico de Pagamentos
              </p>
              <div className="space-y-1.5">
                {pagamentos.map((pg, i) => (
                  <div 
                    key={pg.id} 
                    className="flex items-center justify-between gap-3 rounded border p-2.5" 
                    style={{ 
                      background: `${rc.recibo_cor_bordas}22`, 
                      borderColor: rc.recibo_cor_bordas,
                      fontSize: `${rc.recibo_tamanho_fonte_pagamento}px`
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-bold">{fmtR(Number(pg.valor_pago))}</p>
                      <p className="text-muted-foreground" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>{format(new Date(pg.data_pagamento), "dd/MM/yy HH:mm")}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize" style={{ borderColor: rc.recibo_cor_bordas }}>
                      {FORMA_LABELS[pg.forma_pagamento] ?? pg.forma_pagamento}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer message */}
          <div 
            className="text-center pt-8 pb-4 space-y-2" 
            style={{ 
              borderTop: rc.recibo_borda_rodape ? `1px solid ${rc.recibo_cor_bordas}` : 'none' 
            }}
          >
            {rc.recibo_mensagem_final && (
              <p className="font-bold" style={{ color: rc.recibo_cor_titulos, fontSize: `${rc.recibo_tamanho_fonte_rodape}px` }}>{rc.recibo_mensagem_final}</p>
            )}
            {rc.recibo_rodape && (
              <p className="opacity-60 italic max-w-[250px] mx-auto leading-tight" style={{ fontSize: `${rc.recibo_tamanho_fonte_rodape}px` }}>{rc.recibo_rodape}</p>
            )}
            <p className="text-[8px] opacity-30 mt-4">Emitido por PDV Fácil</p>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptParcelaContent.displayName = "ReceiptParcelaContent";
