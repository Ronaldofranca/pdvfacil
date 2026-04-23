import { useState, useEffect, useCallback } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useSearchParams } from "react-router-dom";
import { normalizeSearch } from "@/lib/utils";
import { ShoppingCart, Search, Plus, Eye, XCircle, Receipt, CreditCard, RefreshCw, Edit } from "lucide-react";
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
import { format, startOfDay, endOfDay, differenceInDays, subDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { NovaDevolucaoDialog } from "@/components/devolucoes/NovaDevolucaoDialog";
import { DetalheVendaSheet } from "@/components/vendas/DetalheVendaSheet";
import { useRelVendedores } from "@/hooks/useRelatorios";

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

  // Filtros — padrão: últimos 3 dias + somente finalizadas
  const [statusFilter, setStatusFilter, clearStatus] = usePersistentState("status", "finalizada", "vendas");
  const [startDate, setStartDate, clearStart] = usePersistentState<Date | undefined>(
    "start_date", 
    undefined, 
    "vendas"
  );
  const [endDate, setEndDate, clearEnd] = usePersistentState<Date | undefined>(
    "end_date", 
    undefined, 
    "vendas"
  );
  const [search, setSearch, clearSearch] = usePersistentState("search", "", "vendas");
  const { data: vendedoresList } = useRelVendedores();

  const vendedorMap = useCallback((id: string) => {
    if (!vendedoresList) return id.slice(0, 8);
    const found = vendedoresList.find(v => v.user_id === id || v.id === id);
    return found ? found.nome : id.slice(0, 8);
  }, [vendedoresList]);

  const clearFilters = useCallback(() => {
    clearStatus();
    setStartDate(undefined);
    setEndDate(undefined);
    setSearch(""); 
  }, [clearStatus, setStartDate, setEndDate, setSearch]);

  const { data: vendas, isLoading } = useVendas({
    status: statusFilter,
    startDate,
    endDate,
    limit: (!startDate && !endDate && !search) ? 10 : 300,
  });
  const cancelar = useCancelarVenda();

  const [pdvOpen, setPdvOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<{ id: string; items: any[]; observations: string; clienteId: string } | null>(null);

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
  const { data: mobileVendaParcelas } = useParcelas(
    { vendaId: mobileActionVendaId ?? undefined },
    { enabled: !!mobileActionVendaId },
  );

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnVendaId, setReturnVendaId] = useState<string | null>(null);

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

  // Filtro de busca por texto (client-side apenas)
  const filtered = vendas?.filter((v) => {
    if (!search) return true;
    return (
      normalizeSearch((v as any).clientes?.nome ?? "").includes(normalizeSearch(search)) ||
      v.id.includes(search)
    );
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

  const handleEditAdmin = (venda: any, itens: any[]) => {
    if (!venda || !itens) return;
    
    let sumLineDiscounts = 0;
    const mappedItems = itens.map(i => {
      sumLineDiscounts += Number(i.desconto || 0);
      return {
        line_id: i.id,
        produto_id: i.produto_id,
        nome: i.nome_produto,
        quantidade: Number(i.quantidade),
        preco_original: Number(i.preco_original),
        preco_vendido: Number(i.preco_vendido),
        desconto: Number(i.desconto),
        bonus: i.bonus,
        subtotal: Number(i.subtotal),
        custo_unitario: Number(i.custo_unitario),
        is_kit: i.item_type === "kit",
        kit_itens: i._kit_composicao || []
      };
    }) as any[];
    
    // Redistribute any global discount that wasn't included in the individual lines
    const globalDiscount = Number(venda.desconto_total || 0) - sumLineDiscounts;
    if (globalDiscount > 0.01 && mappedItems.length > 0) {
      const nonBonus = mappedItems.filter(i => !i.bonus && i.subtotal > 0);
      if (nonBonus.length > 0) {
        nonBonus[0].desconto += globalDiscount;
        nonBonus[0].subtotal -= globalDiscount;
      }
    }
    
    setEditingVenda({
      id: venda.id,
      items: mappedItems,
      observations: venda.observacoes || "",
      clienteId: venda.cliente_id || ""
    });
  };

  const isEditable = (venda: any) => {
    if (!venda || venda.status !== "finalizada") return false;
    const diff = differenceInDays(new Date(), new Date(venda.data_venda));
    return diff < 30;
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="finalizada">Finalizadas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="todas">Todos os status</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "finalizada" || search || !!startDate || !!endDate) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            Limpar filtros
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {!isMobile && <TableHead>ID</TableHead>}
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              {!isMobile && <TableHead className="w-32">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount + 1} className="py-8 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount + 1} className="py-8 text-center text-muted-foreground">
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
                    <TableCell className="text-sm truncate max-w-[120px]">
                      {vendedorMap(v.vendedor_id)}
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
                              {isEditable(v) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Editar venda ${saleIdLabel}`}
                                  onClick={async () => {
                                    // Pre-fetch items if not already available in row (though we usually need hook data)
                                    // For simplicity, we just set the detailId and user can edit from the Detail Sheet
                                    // or we trigger a direct fetch here. 
                                    // To keep it robust, we'll suggest using Detail Sheet edit which already has itensDetail loaded.
                                    setDetailId(v.id);
                                    toast.info("Abra os detalhes para editar esta venda.");
                                  }}
                                  title="Editar venda (Admin)"
                                >
                                  <Edit className="w-4 h-4 text-primary" />
                                </Button>
                              )}
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
                    {isEditable(vendaAcoes) && (
                      <Button
                        className="w-full justify-start gap-2"
                        variant="outline"
                        onClick={() => {
                          setMobileActionVendaId(null);
                          setDetailId(vendaAcoes.id);
                          toast.info("Abra os detalhes para editar esta venda.");
                        }}
                      >
                        <Edit className="w-4 h-4 text-primary" /> Editar venda (Admin)
                      </Button>
                    )}
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
      <PDVModal 
        open={pdvOpen || !!editingVenda} 
        onOpenChange={(open) => {
          if (!open) {
            setPdvOpen(false);
            setEditingVenda(null);
          }
        }} 
        initialCart={editingVenda?.items}
        initialClienteId={editingVenda?.clienteId}
        initialObservacoes={editingVenda?.observations}
        editingVendaId={editingVenda?.id}
      />

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
      <DetalheVendaSheet 
        vendaId={detailId} 
        open={!!detailId} 
        onOpenChange={handleCloseDetail}
        onEditAdmin={handleEditAdmin}
      />
    </div>
  );
}
