import { forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { fmtR } from "@/lib/reportExport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getReceiptConfig } from "@/lib/receiptConfig";

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

interface ReceiptVendaContentProps {
  venda: any;
  itens: any[] | undefined;
  parcelas: any[] | undefined;
  empresa?: any;
  config?: any;
}

// StatusBadge component removed from here, logic moved inside forwardRef

export const ReceiptVendaContent = forwardRef<HTMLDivElement, ReceiptVendaContentProps>(
  ({ venda, itens, parcelas, empresa, config }, ref) => {
    if (!venda) return null;

    const rc = getReceiptConfig(config);

    const StatusBadge = ({ status }: { status: string }) => {
      const label = STATUS_LABELS[status] ?? status;
      const isFinalizada = status === "finalizada";
      const isCancelada = status === "cancelada";

      return (
        <Badge
          style={{
            backgroundColor: isFinalizada ? rc.recibo_cor_principal : isCancelada ? "#ef4444" : "#f1f5f9",
            color: isFinalizada ? "#ffffff" : isCancelada ? "#ffffff" : "#64748b",
            borderColor: "transparent"
          }}
          className="py-1 px-2.5 text-[10px] items-center justify-center whitespace-nowrap overflow-visible font-bold uppercase tracking-wider"
        >
          {label}
        </Badge>
      );
    };

    const vendaId = venda.id.slice(0, 8);
    const clienteNome = (venda as any).clientes?.nome ?? "Consumidor";
    const dataVenda = new Date(venda.data_venda);
    const pagamentos = Array.isArray(venda.pagamentos) ? (venda.pagamentos as any[]) : [];
    const hasCrediario = pagamentos.some((p: any) => p.forma === "crediario");
    const titulo = venda.status === "cancelada" ? "Comprovante de Cancelamento" : (rc.recibo_titulo_venda || "Recibo de Venda");

    return (
      <div
        ref={ref}
        data-receipt-document="venda"
        className="bg-white"
        style={{
          color: rc.recibo_cor_texto,
          fontSize: `${rc.recibo_tamanho_fonte_labels}px` // fallback base
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
              {rc.recibo_exibir_cpf_cnpj && empresa?.cnpj && (
                <p className="opacity-75" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>
                  CNPJ: {empresa.cnpj}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="uppercase tracking-wider font-bold mb-1" style={{ color: rc.recibo_cor_titulo_venda || rc.recibo_cor_principal, fontSize: `${rc.recibo_tamanho_fonte_titulo}px` }}>
              {titulo}
            </p>
            <p className="font-bold leading-tight" style={{ fontSize: `${rc.recibo_tamanho_fonte_venda_id}px` }}>#{vendaId}</p>
            <p className="opacity-75" style={{ fontSize: `${rc.recibo_tamanho_fonte_data}px` }}>
              {format(dataVenda, "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
            <p className="text-[8px] opacity-30 mt-1">V2.1</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Sale details */}
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
              Dados da Venda
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {rc.recibo_exibir_cliente && (
                <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                  <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Cliente</span>
                  <span className="font-semibold" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{clienteNome}</span>
                </div>
              )}
              {rc.recibo_exibir_vendedor && (venda as any).vendedores?.nome && (
                <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                  <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Vendedor</span>
                  <span className="font-semibold" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{(venda as any).vendedores.nome}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 p-2 rounded" style={{ background: `${rc.recibo_cor_bordas}22` }}>
                <span className="text-muted-foreground font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Status</span>
                <StatusBadge status={venda.status} />
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
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted border" style={{ borderColor: rc.recibo_cor_bordas }}>
                        <img
                          src={(item as any).produtos?.imagem_url || "/placeholder.svg"}
                          alt={item.nome_produto}
                          className="h-full w-full object-cover"
                          crossOrigin="anonymous"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <p className="font-bold leading-tight break-words whitespace-normal" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_nome}px` }}>{item.nome_produto}</p>
                        {(item as any).item_type === "kit" && (
                          <Badge variant="outline" className="h-3 px-1 text-[8px] font-bold uppercase" style={{ borderColor: rc.recibo_cor_principal, color: rc.recibo_cor_principal }}>Kit</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_subtitulo}px` }}>
                        {Number(item.quantidade)}x {fmtR(Number(item.preco_vendido))}
                        {item.bonus && <span className="font-bold" style={{ color: rc.recibo_cor_principal }}> (Bônus)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_nome}px` }}>{fmtR(Number(item.subtotal))}</span>
                    </div>
                  </div>

                  {/* Kit Composition */}
                  {(item as any)._kit_composicao?.length > 0 && (
                    <div className="ml-12 mt-1 space-y-0.5 border-l-2 pl-2" style={{ borderColor: rc.recibo_cor_bordas }}>
                      {(item as any)._kit_composicao.map((comp: any, idx: number) => (
                        <p key={idx} className="opacity-70 italic" style={{ fontSize: `${rc.recibo_tamanho_fonte_item_subtitulo}px` }}>• {comp.quantidade}x {comp.produto_nome}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary */}
          <div className="rounded-xl p-4 space-y-2 shadow-sm" style={{ background: `${rc.recibo_cor_principal}08`, border: `1px solid ${rc.recibo_cor_principal}22` }}>
            <div className="flex justify-between font-medium" style={{ fontSize: `${rc.recibo_tamanho_fonte_subtotal}px` }}>
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{fmtR(Number(venda.subtotal))}</span>
            </div>
            {Number(venda.desconto_total) > 0 && (
              <div className="flex justify-between font-medium text-destructive" style={{ fontSize: `${rc.recibo_tamanho_fonte_subtotal}px` }}>
                <span>Descontos</span>
                <span className="font-semibold">-{fmtR(Number(venda.desconto_total))}</span>
              </div>
            )}
            <Separator style={{ background: `${rc.recibo_cor_principal}44` }} />
            <div className="flex justify-between font-bold" style={{ color: rc.recibo_cor_total, fontSize: `${rc.recibo_tamanho_fonte_total}px` }}>
              <span>TOTAL</span>
              <span>{fmtR(Number(venda.total))}</span>
            </div>
          </div>

          {/* Payment info */}
          {rc.recibo_exibir_forma_pagamento && pagamentos.length > 0 && (
            <div
              className="space-y-1.5 mt-2 rounded-lg"
              style={{ border: rc.recibo_borda_pagamento ? `1px solid ${rc.recibo_cor_bordas}` : 'none' }}
            >
              {pagamentos.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between gap-4 p-2.5 rounded border"
                  style={{
                    background: `${rc.recibo_cor_bordas}22`,
                    borderColor: rc.recibo_cor_bordas,
                    fontSize: `${rc.recibo_tamanho_fonte_pagamento}px`
                  }}
                >
                  <span className="font-medium text-muted-foreground capitalize">{FORMA_LABELS[p.forma] ?? p.forma}</span>
                  <span className="font-bold">{fmtR(p.valor)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Build Info/Notes */}
          {(rc.recibo_exibir_observacoes && venda.observacoes) && (
            <div className="p-3 rounded border border-dashed" style={{ borderColor: rc.recibo_cor_bordas }}>
              <p className="uppercase font-bold text-muted-foreground mb-1" style={{ fontSize: `${rc.recibo_tamanho_fonte_labels}px` }}>Observações</p>
              <p className="leading-relaxed italic" style={{ fontSize: `${rc.recibo_tamanho_fonte_valores}px` }}>{venda.observacoes}</p>
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

ReceiptVendaContent.displayName = "ReceiptVendaContent";
