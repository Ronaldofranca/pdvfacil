import { forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { fmtR } from "@/lib/reportExport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getReceiptConfig } from "@/lib/receiptConfig";

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_entrega: "Aguardando Entrega",
  em_rota: "Em Rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
  convertido_em_venda: "Convertido em Venda",
};

interface ReceiptPedidoContentProps {
  pedido: any;
  itens: any[] | undefined;
  empresa?: any;
  config?: any;
}

export const ReceiptPedidoContent = forwardRef<HTMLDivElement, ReceiptPedidoContentProps>(
  ({ pedido, itens, empresa, config }, ref) => {
    if (!pedido) return null;

    const rc = getReceiptConfig(config);

    const StatusBadge = ({ status }: { status: string }) => {
      const label = STATUS_LABELS[status] ?? status;
      const isFinalizada = status === "entregue" || status === "convertido_em_venda";
      const isCancelada = status === "cancelado";

      return (
        <Badge
          style={{
            backgroundColor: isFinalizada ? rc.recibo_cor_principal : isCancelada ? "#ef4444" : "#f1f5f9",
            color: isFinalizada ? "#ffffff" : isCancelada ? "#ffffff" : "#64748b",
            borderColor: "transparent"
          }}
          className="pt-[2px] pb-[4px] px-2.5 text-[10px] inline-flex items-center justify-center whitespace-nowrap overflow-visible font-bold uppercase tracking-wider"
        >
          <span>{label}</span>
        </Badge>
      );
    };

    const pedidoIdShort = pedido.id.slice(0, 8);
    const clienteNome = pedido.clientes?.nome ?? "Cliente não identificado";
    const dataPedido = new Date(pedido.created_at || pedido.data_pedido);
    const dataEntrega = pedido.data_prevista_entrega;
    const titulo = rc.recibo_titulo_venda ? rc.recibo_titulo_venda.replace("Venda", "Pedido") : "Recibo de Pedido";

    return (
      <div
        ref={ref}
        data-receipt-document="pedido"
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
              {rc.recibo_exibir_telefone && empresa?.telefone && (
                <p className="opacity-75 mt-0.5" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>
                  📞 {empresa.telefone}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wider font-bold mb-1" style={{ color: rc.recibo_cor_titulo_venda || rc.recibo_cor_principal, fontSize: `${rc.recibo_tamanho_fonte_titulo}px` }}>
              {titulo}
            </p>
            <p className="font-bold leading-tight" style={{ fontSize: `${rc.recibo_tamanho_fonte_venda_id}px` }}>#{pedidoIdShort}</p>
            <p className="opacity-75" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>
              {format(dataPedido, "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Order info */}
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
              Dados do Pedido
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Cliente</span>
                <span className="font-semibold" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{clienteNome}</span>
              </div>
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Previsão Entrega</span>
                <span className="font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>
                  {format(new Date(dataEntrega + "T12:00:00"), "dd/MM/yyyy")}
                  {pedido.horario_entrega ? ` às ${pedido.horario_entrega}` : ""}
                </span>
              </div>
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Status</span>
                <StatusBadge status={pedido.status} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div
            className="p-3 rounded-lg"
            style={{
              border: rc.recibo_borda_itens ? `1px solid ${rc.recibo_cor_bordas}` : 'none'
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
              Produtos
            </p>
            <div className="space-y-1">
              {itens?.map((item) => (
                <div
                  key={item.id}
                  className="p-2"
                  style={{
                    borderBottom: rc.recibo_borda_item_linha ? `1px solid ${rc.recibo_cor_bordas}44` : 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    {rc.recibo_exibir_imagem_produto && (
                      <div 
                        className="flex-shrink-0 overflow-hidden rounded bg-muted border" 
                        style={{ 
                          borderColor: rc.recibo_cor_bordas,
                          width: `${rc.recibo_imagem_produto_largura}px`,
                          height: `${rc.recibo_imagem_produto_altura}px`
                        }}
                      >
                        <img
                          src={item.produtos?.imagem_url || "/placeholder.svg"}
                          alt={item.nome_produto}
                          className="h-full w-full object-cover"
                          crossOrigin="anonymous"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-tight break-words whitespace-normal" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_nome}px` }}>{item.nome_produto}</p>
                      <p className="text-muted-foreground" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_subtitulo}px` }}>
                        {Number(item.quantidade)}x {fmtR(Number(item.preco_pedido))}
                        {item.bonus && <span className="font-bold" style={{ color: rc.recibo_cor_principal }}> (Bônus)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_nome}px` }}>{fmtR(Number(item.subtotal))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary */}
          <div className="rounded-xl p-4 space-y-2 shadow-sm" style={{ background: `${rc.recibo_cor_principal}08`, border: `1px solid ${rc.recibo_cor_principal}22` }}>
            <div className="flex justify-between font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_subtotal}px` }}>
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{fmtR(Number(pedido.subtotal))}</span>
            </div>
            {Number(pedido.desconto_total) > 0 && (
              <div className="flex justify-between font-medium text-destructive" style={{ fontSize: `${rc.recibo_tamanho_fonte_subtotal}px` }}>
                <span>Descontos</span>
                <span className="font-semibold">-{fmtR(Number(pedido.desconto_total))}</span>
              </div>
            )}
            <Separator style={{ background: `${rc.recibo_cor_principal}44` }} />
            <div className="flex justify-between font-bold" style={{ color: rc.recibo_cor_total, fontSize: `${rc.recibo_tamanho_fonte_total}px` }}>
              <span>TOTAL</span>
              <span>{fmtR(Number(pedido.valor_total))}</span>
            </div>
          </div>

          {(rc.recibo_exibir_observacoes && pedido.observacoes) && (
            <div className="p-3 rounded border border-dashed" style={{ borderColor: rc.recibo_cor_bordas }}>
              <p className="uppercase font-bold text-muted-foreground mb-1" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Observações</p>
              <p className="leading-relaxed italic" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{pedido.observacoes}</p>
            </div>
          )}

          <div
            className="text-center pt-8 pb-4 space-y-2"
            style={{
              borderTop: rc.recibo_borda_rodape ? `1px solid ${rc.recibo_cor_bordas}` : 'none'
            }}
          >
            {rc.recibo_mensagem_final && (
              <p className="font-bold" style={{ color: rc.recibo_cor_titulos, fontSize: `${rc.recibo_tamanho_fonte_rodape}px` }}>{rc.recibo_mensagem_final}</p>
            )}
            <p className="text-[8px] opacity-30 mt-4">Emitido por PDV Fácil</p>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptPedidoContent.displayName = "ReceiptPedidoContent";
