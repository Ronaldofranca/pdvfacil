import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Receipt, RefreshCw, Edit } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVenda, useVendaItens } from "@/hooks/useVendas";
import { useVendaDevolucoes } from "@/hooks/useDevolucoes";
import { ReciboVenda } from "./ReciboVenda";
import { DetalheDevolucaoDialog } from "@/components/devolucoes/DetalheDevolucaoDialog";
import { usePermissions } from "@/hooks/usePermissions";

interface DetalheVendaSheetProps {
  vendaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditAdmin?: (venda: any, items: any[]) => void;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  pendente: { label: "Pendente", variant: "secondary" },
  finalizada: { label: "Finalizada", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function DetalheVendaSheet({ vendaId, open, onOpenChange, onEditAdmin }: DetalheVendaSheetProps) {
  const { isAdmin } = usePermissions();
  const { data: vendaDetail } = useVenda(vendaId);
  const { data: itensDetail } = useVendaItens(vendaId);
  const { data: devolucoesVinculadas } = useVendaDevolucoes(vendaId);

  const [reciboVenda, setReciboVenda] = useState<any>(null);
  const [viewDevolucaoId, setViewDevolucaoId] = useState<string | null>(null);
  const [isDevolucaoDetailOpen, setIsDevolucaoDetailOpen] = useState(false);

  const isEditable = (venda: any) => {
    if (!venda || venda.status !== "finalizada") return false;
    const diff = differenceInDays(new Date(), new Date(venda.data_venda));
    return diff < 30;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalhes da Venda</SheetTitle>
          </SheetHeader>

          {vendaDetail ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  <span className="font-mono">{vendaDetail.id.slice(0, 8)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={STATUS_MAP[vendaDetail.status]?.variant}>
                    {STATUS_MAP[vendaDetail.status]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  {(vendaDetail as any).clientes?.nome ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>{" "}
                  {format(new Date(vendaDetail.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
              </div>

              {vendaDetail.status === "cancelada" && (vendaDetail as any).motivo_cancelamento && (
                <div className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm">
                  <p className="font-semibold text-destructive">Venda Cancelada</p>
                  <p className="text-muted-foreground">Motivo: {(vendaDetail as any).motivo_cancelamento}</p>
                  {(vendaDetail as any).cancelado_em && (
                    <p className="text-xs text-muted-foreground">
                      Em: {format(new Date((vendaDetail as any).cancelado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Itens</p>
                {itensDetail?.map((item) => (
                  <div key={item.id} className="flex justify-between rounded border p-2 text-sm">
                    <div>
                      <p className="font-medium">{item.nome_produto}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(item.quantidade)}x {fmt(Number(item.preco_vendido))}
                        {item.bonus && " (Bônus)"}
                        {Number(item.desconto) > 0 && ` -${fmt(Number(item.desconto))}`}
                      </p>
                    </div>
                    <span className="font-medium">{fmt(Number(item.subtotal))}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmt(Number(vendaDetail.subtotal))}</span>
                </div>
                {Number(vendaDetail.desconto_total) > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Descontos</span>
                    <span>-{fmt(Number(vendaDetail.desconto_total))}</span>
                  </div>
                )}
                {(() => {
                  const totalBonus =
                    itensDetail
                      ?.filter((i) => i.bonus)
                      .reduce((s, i) => s + Number(i.preco_original) * Number(i.quantidade), 0) ?? 0;
                  return totalBonus > 0 ? (
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>🎁 Bônus concedidos</span>
                      <span>-{fmt(totalBonus)}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{fmt(Number(vendaDetail.total))}</span>
                </div>
              </div>

              {vendaDetail.pagamentos && Array.isArray(vendaDetail.pagamentos) && (vendaDetail.pagamentos as any[]).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Pagamentos</p>
                    {(vendaDetail.pagamentos as any[]).map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="capitalize">{p.forma?.replace("_", " ")}</span>
                        <span>{fmt(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {vendaDetail.observacoes && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{vendaDetail.observacoes}</p>
                </>
              )}

              {devolucoesVinculadas && devolucoesVinculadas.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-bold flex items-center gap-2 text-amber-600 uppercase tracking-tighter">
                      <RefreshCw className="w-4 h-4" /> Devoluções Vinculadas
                    </p>
                    <div className="space-y-2">
                       {devolucoesVinculadas.map((d: any) => (
                         <button
                           key={d.id}
                           onClick={() => { setViewDevolucaoId(d.id); setIsDevolucaoDetailOpen(true); }}
                           className="w-full flex items-center justify-between p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
                         >
                           <div className="space-y-0.5">
                             <p className="text-[10px] font-mono text-muted-foreground uppercase">#{d.id.slice(0, 8)}</p>
                             <p className="text-xs font-bold">{format(new Date(d.data_devolucao), "dd/MM/yy HH:mm")}</p>
                           </div>
                           <div className="text-right">
                             <p className="text-sm font-bold text-amber-600">{fmt(Number(d.valor_total_devolvido))}</p>
                             <p className="text-[9px] uppercase font-bold text-muted-foreground">Ver Detalhes</p>
                           </div>
                         </button>
                       ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {isAdmin && isEditable(vendaDetail) && onEditAdmin && (
                <Button
                  className="w-full gap-2 bg-primary/10 text-primary hover:bg-primary/20"
                  variant="outline"
                  onClick={() => onEditAdmin(vendaDetail, itensDetail || [])}
                >
                  <Edit className="w-4 h-4" /> Editar Venda (Admin)
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => setReciboVenda(vendaDetail)}
              >
                <Receipt className="w-4 h-4" /> Gerar Recibo
              </Button>
            </div>
          ) : (
            <div className="mt-8 text-center text-muted-foreground py-10">
              {vendaId ? "Carregando detalhes..." : "Venda não encontrada."}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ReciboVenda
        open={!!reciboVenda}
        onOpenChange={(o) => !o && setReciboVenda(null)}
        venda={reciboVenda}
      />

      <DetalheDevolucaoDialog 
        id={viewDevolucaoId}
        open={isDevolucaoDetailOpen}
        onOpenChange={setIsDevolucaoDetailOpen}
      />
    </>
  );
}
