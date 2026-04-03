import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ShoppingCart, Search, Plus, Eye, XCircle, Receipt, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useVendas, useVendaItens, useCancelarVenda, useVendaParcelas, useVenda } from "@/hooks/useVendas";
import { useParcelas } from "@/hooks/useParcelas";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { PDVModal } from "@/components/vendas/PDVModal";
import { ReciboVenda } from "@/components/vendas/ReciboVenda";
import { PagamentoForm } from "@/components/financeiro/PagamentoForm";
import { DateRangeFilter } from "@/components/vendas/DateRangeFilter";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovaDevolucaoDialog } from "@/components/devolucoes/NovaDevolucaoDialog";
import { DetalheDevolucaoDialog } from "@/components/devolucoes/DetalheDevolucaoDialog";
import { useVendaDevolucoes } from "@/hooks/useDevolucoes";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  pendente: { label: "Pendente", variant: "secondary" },
  finalizada: { label: "Finalizada", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

export default function VendasPage() {
  const isMobile = useIsMobile();
  const { canCreateVenda, isAdmin } = usePermissions();
  const { user } = useAuth();
  const { data: vendas, isLoading } = useVendas();
  const cancelar = useCancelarVenda();

  const [pdvOpen, setPdvOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(searchParams.get("viewVenda"));
  const [reciboVenda, setReciboVenda] = useState<any>(null);
  const [mobileActionVendaId, setMobileActionVendaId] = useState<string | null>(null);

  // Monitor deep link on URL changes
  useEffect(() => {
    const viewVendaId = searchParams.get("viewVenda");
    if (viewVendaId && viewVendaId !== detailId) {
      setDetailId(viewVendaId);
    }
  }, [searchParams]);

  const handleCloseDetail = (open: boolean) => {
    if (!open) {
      setDetailId(null);
      // Clean query string quietly
      if (searchParams.get("viewVenda")) {
        setSearchParams({}, { replace: true });
      }
    }
  };

  const { data: fetchVendaUnica } = useVenda(detailId);
  const [pagamentoState, setPagamentoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const { data: itensDetail } = useVendaItens(detailId);
  const { data: devolucoesVinculadas } = useVendaDevolucoes(detailId);
  const { data: mobileVendaParcelas } = useParcelas(
    { vendaId: mobileActionVendaId ?? undefined },
    { enabled: !!mobileActionVendaId },
  );

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnVendaId, setReturnVendaId] = useState<string | null>(null);
  
  const [viewDevolucaoId, setViewDevolucaoId] = useState<string | null>(null);
  const [isDevolucaoDetailOpen, setIsDevolucaoDetailOpen] = useState(false);

  // Cancellation dialog
  const [cancelDialogVendaId, setCancelDialogVendaId] = useState<string | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const { data: cancelParcelas } = useVendaParcelas(cancelDialogVendaId);

  const vendaDetailOrig = vendas?.find((v) => v.id === detailId);
  const vendaDetail = vendaDetailOrig ?? fetchVendaUnica ?? null;

  const parcelasComPagamento = cancelParcelas?.filter((p) => Number(p.valor_pago) > 0) ?? [];
  const valorJaPago = parcelasComPagamento.reduce((s, p) => s + Number(p.valor_pago), 0);

  const vendaAcoes = vendas?.find((v) => v.id === mobileActionVendaId) ?? null;
  const parcelaAbertaVenda =
    mobileVendaParcelas?.find((p) => ["pendente", "parcial", "vencida"].includes(String((p as any).status))) ?? null;

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = vendas?.filter((v) => {
    const matchesSearch = 
      (v as any).clientes?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      v.id.includes(search);
    
    // Range filter: check if data_venda is within [startDate, endDate]
    const itemDate = new Date(v.data_venda);
    const matchesStart = !startDate || itemDate >= startOfDay(startDate);
    const matchesEnd = !endDate || itemDate <= endOfDay(endDate);
    
    // Safety check for inverted interval
    const isValidInterval = !startDate || !endDate || startDate <= endDate;

    return matchesSearch && matchesStart && matchesEnd && isValidInterval;
  });

  const visibleColumnCount = isMobile ? 4 : 6;

  const handleConfirmCancel = () => {
    if (!cancelDialogVendaId || !user) return;
    cancelar.mutate(
      { vendaId: cancelDialogVendaId, motivo: cancelMotivo, userId: user.id },
      {
        onSuccess: () => {
          setCancelDialogVendaId(null);
          setCancelMotivo("");
        },
      },
    );
  };

  const openMobileActions = (vendaId: string) => {
    if (!isMobile) return;
    setMobileActionVendaId(vendaId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Vendas</h1>
            <p className="text-sm text-muted-foreground">PDV e histórico de vendas</p>
          </div>
        </div>
        {canCreateVenda && (
          <Button size="sm" className="gap-1.5" onClick={() => setPdvOpen(true)}>
            <Plus className="w-4 h-4" /> Nova Venda
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por cliente ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>
      </div>

      {isMobile && (
        <p className="px-1 text-xs text-muted-foreground">
          Toque em uma venda para abrir ações rápidas sem precisar arrastar a tabela.
        </p>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {!isMobile && <TableHead>ID</TableHead>}
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              {!isMobile && <TableHead className="w-32">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="py-8 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="py-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => {
                const st = STATUS_MAP[v.status] ?? STATUS_MAP.rascunho;
                const saleIdLabel = v.id.slice(0, 8);

                return (
                  <TableRow
                    key={v.id}
                    className={isMobile ? "cursor-pointer active:bg-muted/80" : undefined}
                    onClick={isMobile ? () => openMobileActions(v.id) : undefined}
                    onKeyDown={
                      isMobile
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openMobileActions(v.id);
                            }
                          }
                        : undefined
                    }
                    role={isMobile ? "button" : undefined}
                    tabIndex={isMobile ? 0 : undefined}
                    aria-label={isMobile ? `Abrir ações da venda ${saleIdLabel}` : undefined}
                  >
                    {!isMobile && <TableCell className="font-mono text-xs">{saleIdLabel}</TableCell>}
                    <TableCell className="font-medium">
                      <div className="min-w-0">
                        <p className="truncate">{(v as any).clientes?.nome ?? "—"}</p>
                        {isMobile && <p className="text-xs text-muted-foreground">#{saleIdLabel}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(v.data_venda), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(Number(v.total))}</TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ver venda ${saleIdLabel}`}
                            onClick={() => setDetailId(v.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Gerar recibo da venda ${saleIdLabel}`}
                            onClick={() => setReciboVenda(v)}
                            title="Recibo"
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>
                          {isAdmin && v.status === "finalizada" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Devolver itens da venda ${saleIdLabel}`}
                                onClick={() => {
                                  setReturnVendaId(v.id);
                                  setReturnDialogOpen(true);
                                }}
                                title="Devolver itens"
                              >
                                <RefreshCw className="w-4 h-4 text-amber-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Cancelar venda ${saleIdLabel}`}
                                onClick={() => setCancelDialogVendaId(v.id)}
                                title="Cancelar venda"
                              >
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Drawer open={isMobile && !!mobileActionVendaId} onOpenChange={(open) => !open && setMobileActionVendaId(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Ações da venda</DrawerTitle>
          </DrawerHeader>
          {vendaAcoes && (
            <div className="space-y-4 overflow-y-auto px-4 pb-5">
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{(vendaAcoes as any).clientes?.nome ?? "Cliente não informado"}</p>
                      <p className="text-xs text-muted-foreground">Venda #{vendaAcoes.id.slice(0, 8)}</p>
                    </div>
                    <Badge variant={STATUS_MAP[vendaAcoes.status]?.variant ?? "outline"}>
                      {STATUS_MAP[vendaAcoes.status]?.label ?? vendaAcoes.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p>Data</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(vendaAcoes.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p>Total</p>
                      <p className="font-semibold text-foreground">{fmt(Number(vendaAcoes.total))}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => {
                    setMobileActionVendaId(null);
                    setDetailId(vendaAcoes.id);
                  }}
                >
                  <Eye className="w-4 h-4" /> Ver venda
                </Button>

                {parcelaAbertaVenda ? (
                  <Button
                    className="w-full justify-start gap-2"
                    variant="outline"
                    onClick={() => {
                      setMobileActionVendaId(null);
                      setPagamentoState({ open: true, data: parcelaAbertaVenda });
                    }}
                  >
                    <CreditCard className="w-4 h-4" /> Pagar venda
                  </Button>
                ) : (
                  <Button className="w-full justify-start gap-2" variant="outline" disabled>
                    <CreditCard className="w-4 h-4" /> Venda quitada
                  </Button>
                )}

                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => {
                    setMobileActionVendaId(null);
                    setReciboVenda(vendaAcoes);
                  }}
                >
                  <Receipt className="w-4 h-4" /> Gerar recibo
                </Button>

                {isAdmin && vendaAcoes.status === "finalizada" && (
                  <>
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => {
                        setMobileActionVendaId(null);
                        setReturnVendaId(vendaAcoes.id);
                        setReturnDialogOpen(true);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 text-amber-500" /> Devolver itens
                    </Button>
                    <Button
                      className="w-full justify-start gap-2"
                      variant="destructive"
                      onClick={() => {
                        setMobileActionVendaId(null);
                        setCancelDialogVendaId(vendaAcoes.id);
                      }}
                    >
                      <XCircle className="w-4 h-4" /> Cancelar venda
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* PDV */}
      <PDVModal open={pdvOpen} onOpenChange={setPdvOpen} />

      <PagamentoForm
        open={pagamentoState.open}
        onOpenChange={(open) => setPagamentoState((prev) => ({ ...prev, open }))}
        parcela={pagamentoState.data}
      />

      {/* Recibo de Venda */}
      <ReciboVenda
        open={!!reciboVenda}
        onOpenChange={(o) => !o && setReciboVenda(null)}
        venda={reciboVenda}
      />

      {/* Cancellation confirmation dialog */}
      <Dialog
        open={!!cancelDialogVendaId}
        onOpenChange={(o) => {
          if (!o) {
            setCancelDialogVendaId(null);
            setCancelMotivo("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancelar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta ação cancelará a venda, estornará parcelas não pagas e reverterá o estoque.
              O histórico será preservado.
            </p>
            {parcelasComPagamento.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm space-y-1">
                <p className="flex items-center gap-1.5 font-semibold text-destructive">⚠️ Atenção: Pagamentos Existentes</p>
                <p className="text-muted-foreground">
                  Esta venda possui {parcelasComPagamento.length} parcela(s) com pagamentos já registrados
                  totalizando <span className="font-semibold text-foreground">{fmt(valorJaPago)}</span>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Os pagamentos serão mantidos no histórico. Parcelas serão marcadas como canceladas com registro do estorno.
                </p>
              </div>
            )}
            <div>
              <Label>Motivo do cancelamento *</Label>
              <Textarea
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelDialogVendaId(null); setCancelMotivo(""); }}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelMotivo.trim() || cancelar.isPending}
              onClick={handleConfirmCancel}
            >
              {cancelar.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes da venda */}
      <Sheet open={!!detailId} onOpenChange={handleCloseDetail}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalhes da Venda</SheetTitle>
          </SheetHeader>
          {vendaDetail && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{vendaDetail.id.slice(0, 8)}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={STATUS_MAP[vendaDetail.status]?.variant}>{STATUS_MAP[vendaDetail.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Cliente:</span> {(vendaDetail as any).clientes?.nome ?? "—"}</div>
                <div><span className="text-muted-foreground">Data:</span> {format(new Date(vendaDetail.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(Number(vendaDetail.subtotal))}</span></div>
                {Number(vendaDetail.desconto_total) > 0 && (
                  <div className="flex justify-between text-destructive"><span>Descontos</span><span>-{fmt(Number(vendaDetail.desconto_total))}</span></div>
                )}
                {(() => {
                  const totalBonus = itensDetail?.filter(i => i.bonus).reduce((s, i) => s + Number(i.preco_original) * Number(i.quantidade), 0) ?? 0;
                  return totalBonus > 0 ? (
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>🎁 Bônus concedidos</span>
                      <span>-{fmt(totalBonus)}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{fmt(Number(vendaDetail.total))}</span></div>
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
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => {
                  setDetailId(null);
                  setReciboVenda(vendaDetail);
                }}
              >
                <Receipt className="w-4 h-4" /> Gerar Recibo
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <NovaDevolucaoDialog 
        open={returnDialogOpen} 
        onOpenChange={setReturnDialogOpen}
        initialVendaId={returnVendaId}
      />

      <DetalheDevolucaoDialog 
        id={viewDevolucaoId}
        open={isDevolucaoDetailOpen}
        onOpenChange={setIsDevolucaoDetailOpen}
      />
    </div>
  );
}
