import { useState, useMemo, useCallback } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useNavigate } from "react-router-dom";
import { normalizeSearch } from "@/lib/utils";
import {
  DollarSign,
  Search,
  Plus,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Receipt,
  CircleDot,
  Eye,
  ListChecks,
  X,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useParcelas, usePagamentos } from "@/hooks/useParcelas";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { GerarParcelasForm } from "@/components/financeiro/GerarParcelasForm";
import { PagamentoForm } from "@/components/financeiro/PagamentoForm";
import { PagamentoLoteForm } from "@/components/financeiro/PagamentoLoteForm";
import { ReciboParcela } from "@/components/financeiro/ReciboParcela";
import { DateRangeFilter } from "@/components/vendas/DateRangeFilter";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetalheVendaSheet } from "@/components/vendas/DetalheVendaSheet";

const STATUS_CFG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "warning" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "secondary", icon: Clock },
  parcial: { label: "Parcial", variant: "warning", icon: CircleDot },
  paga: { label: "Paga", variant: "default", icon: CheckCircle },
  vencida: { label: "Vencida", variant: "destructive", icon: AlertTriangle },
};

export default function FinanceiroPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { canRegisterPagamento } = usePermissions();
  const [statusFilter, setStatusFilter, clearStatus] = usePersistentState("status", "todas", "financeiro");
  const [search, setSearch, clearSearch] = usePersistentState("search", "", "financeiro");
  const [startDate, setStartDate, clearStart] = usePersistentState<Date | undefined>("start_date", undefined, "financeiro");
  const [endDate, setEndDate, clearEnd] = usePersistentState<Date | undefined>("end_date", undefined, "financeiro");

  // Seleção múltipla — declarada antes de clearFilters para evitar TDZ
  const [selectedIdsArray, setSelectedIdsArray, clearSelectedIds] = usePersistentState<string[]>("selected_ids", [], "financeiro");
  const selectedIds = useMemo(() => new Set(selectedIdsArray), [selectedIdsArray]);
  
  const setSelectedIds = useCallback((updater: (prev: Set<string>) => Set<string>) => {
    setSelectedIdsArray((prevArray) => {
      const prevSet = new Set(prevArray);
      const nextSet = updater(prevSet);
      return Array.from(nextSet);
    });
  }, [setSelectedIdsArray]);

  const clearFilters = useCallback(() => {
    clearStatus();
    clearSearch();
    clearStart();
    clearEnd();
    clearSelectedIds();
  }, [clearStatus, clearSearch, clearStart, clearEnd, clearSelectedIds]);

  const [gerarOpen, setGerarOpen] = useState(false);
  const [pagamentoState, setPagamentoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [reciboState, setReciboState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [mobileParcela, setMobileParcela] = useState<any | null>(null);
  const [detailState, setDetailState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [vendaDetailId, setVendaDetailId] = useState<string | null>(null);

  const [loteOpen, setLoteOpen] = useState(false);

  const { data: parcelas, isLoading } = useParcelas({
    status: statusFilter,
    startDate: startDate ? startOfDay(startDate) : undefined,
    endDate: endDate ? endOfDay(endDate) : undefined,
  });

  const { data: todasParcelasNoPeriodo } = useParcelas({
    startDate: startDate ? startOfDay(startDate) : undefined,
    endDate: endDate ? endOfDay(endDate) : undefined,
  });

  // Parcelas vencidas no período selecionado (para o card "Vencido")
  const { data: parcelasVencidasNoPeriodo } = useParcelas({
    status: "vencida",
    startDate: startDate ? startOfDay(startDate) : undefined,
    endDate: endDate ? endOfDay(endDate) : undefined,
  });

  const { data: pagamentosNoPeriodo } = usePagamentos({
    startDate: startDate ? startOfDay(startDate) : undefined,
    endDate: endDate ? endOfDay(endDate) : undefined,
  });


  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = parcelas?.filter((p) =>
    normalizeSearch((p as any).clientes?.nome ?? "").includes(normalizeSearch(search)) || !search
  );

  const isDateInRange = (dateStr: string | null, start: Date | undefined, end: Date | undefined) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T12:00:00");
    const s = start ? startOfDay(start) : null;
    const e = end ? endOfDay(end) : null;
    return (!s || d >= s) && (!e || d <= e);
  };

  const matchesSearch = (nome: string | null | undefined) =>
    !search || normalizeSearch(nome ?? "").includes(normalizeSearch(search));

  const totalPendente =
    todasParcelasNoPeriodo?.filter((p) =>
      (p.status === "pendente" || p.status === "parcial") &&
      isDateInRange(p.vencimento, startDate, endDate) &&
      matchesSearch((p as any).clientes?.nome)
    ).reduce((s, p) => s + Number(p.saldo), 0) ?? 0;

  const todayISO = new Date().toISOString().split("T")[0];
  // Card "Vencido" respeita o mesmo período e busca dos outros filtros
  const totalVencido =
    parcelasVencidasNoPeriodo?.filter((p) => {
      if (!matchesSearch((p as any).clientes?.nome)) return false;
      if (Number(p.saldo) <= 0) return false;
      return true;
    }).reduce((s, p) => s + Number(p.saldo), 0) ?? 0;

  const totalParcial =
    todasParcelasNoPeriodo?.filter((p) =>
      p.status === "parcial" &&
      isDateInRange(p.vencimento, startDate, endDate) &&
      matchesSearch((p as any).clientes?.nome)
    ).reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;

  const totalRecebido =
    pagamentosNoPeriodo?.filter((pay) =>
      matchesSearch((pay as any).parcelas?.clientes?.nome)
    ).reduce((s, pay) => s + Number(pay.valor_pago), 0) ?? 0;

  // Parcelas selecionadas (objetos completos, ordenadas por vencimento)
  const parcelasSelecionadas = useMemo(() => {
    if (!filtered || selectedIds.size === 0) return [];
    return filtered
      .filter((p) => selectedIds.has(p.id))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [filtered, selectedIds]);

  const saldoSelecionado = parcelasSelecionadas.reduce((s, p) => s + Number(p.saldo), 0);

  const toggleSelect = (id: string, status: string) => {
    if (status === "paga") return; // quitadas não podem ser selecionadas
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(() => new Set());

  // Lógica para Selecionar Tudo
  const selectableFiltered = useMemo(() => {
    return filtered?.filter(p => p.status !== "paga") || [];
  }, [filtered]);

  const isAllSelected = selectableFiltered.length > 0 && selectableFiltered.every(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      const newIds = new Set(selectedIds);
      selectableFiltered.forEach(p => newIds.add(p.id));
      setSelectedIds(() => newIds);
    }
  };

  const visibleColumnCount = isMobile ? 5 : 10;

  const openMobileActions = (parcela: any) => {
    if (!isMobile) return;
    setMobileParcela(parcela);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Parcelas e cobranças</p>
          </div>
        </div>
        {canRegisterPagamento && (
          <Button size="sm" className="gap-1.5" onClick={() => setGerarOpen(true)}>
            <Plus className="w-4 h-4" /> Gerar Parcelas
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalPendente)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Vencido</p>
          <p className="text-lg font-bold text-destructive">{fmt(totalVencido)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Parcial Recebido</p>
          <p className="text-lg font-bold text-amber-500">{fmt(totalParcial)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-lg font-bold text-primary">{fmt(totalRecebido)}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="w-full sm:w-auto">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-1.5 w-3.5 h-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos Status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="parcial">Parcialmente Pagas</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
              <SelectItem value="paga">Pagas</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter !== "todas" || search || startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* ── MOBILE: Parcela tiles (zero scroll horizontal) ── */}
      <div className="md:hidden space-y-2">
        {canRegisterPagamento && selectableFiltered.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} id="sel-all-mobile" aria-label="Selecionar todas" />
            <label htmlFor="sel-all-mobile" className="text-xs text-muted-foreground cursor-pointer">
              Selecionar todas as pendentes
            </label>
          </div>
        )}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Carregando...</p>
        ) : !filtered?.length ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma parcela encontrada</p>
        ) : (
          filtered.map((p) => {
            const isOverdue = p.status === "vencida" || (["pendente", "parcial"].includes(p.status) && p.vencimento < todayISO);
            const isPaga = p.status === "paga";
            const isParcial = p.status === "parcial";
            let latestPaymentDateStr = p.data_pagamento;
            if ((p as any).pagamentos?.length > 0) {
              const arr = (p as any).pagamentos as { data_pagamento: string }[];
              latestPaymentDateStr = arr.reduce((acc, curr) => curr.data_pagamento > acc ? curr.data_pagamento : acc, arr[0].data_pagamento);
            }
            const cfg = isOverdue ? STATUS_CFG.vencida : (STATUS_CFG[p.status] ?? STATUS_CFG.pendente);
            const Icon = cfg.icon;
            const isSelected = selectedIds.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className="w-full text-left"
                onClick={() => openMobileActions(p)}
                aria-label={`Abrir ações do fiado ${p.numero}`}
              >
                <Card className={`p-3 transition-colors active:bg-muted/60 ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {canRegisterPagamento && !isPaga && (
                        <div onClick={(e) => { e.stopPropagation(); toggleSelect(p.id, p.status); }} className="mt-0.5">
                          <Checkbox checked={isSelected} aria-label={`Selecionar parcela ${p.numero}`} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{(p as any).clientes?.nome ?? "—"}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">Parc. {p.numero}ª</span>
                          <span className="text-xs text-muted-foreground">
                            Venc. {format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yy", { locale: ptBR })}
                          </span>
                          {(isPaga || isParcial) && latestPaymentDateStr && (
                            <span className="text-xs text-muted-foreground">
                              · Pago {format(new Date(latestPaymentDateStr), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant={cfg.variant} className="gap-1 text-[10px] py-0">
                        <Icon className="w-3 h-3" />{cfg.label}
                      </Badge>
                      <span className={`text-sm font-bold ${Number(p.saldo) > 0 ? "text-destructive" : "text-primary"}`}>
                        {fmt(Number(p.saldo))}
                      </span>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })
        )}
      </div>

      {/* ── DESKTOP: Tabela completa ── */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {canRegisterPagamento && (
                <TableHead className="w-10">
                  {selectableFiltered.length > 0 && (
                    <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todas" />
                  )}
                </TableHead>
              )}
              <TableHead className="w-12 text-xs">Nº</TableHead>
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="w-24 text-xs">Venc.</TableHead>
              <TableHead className="w-24 text-xs text-center">Pago em</TableHead>
              <TableHead className="w-20 text-right text-xs">Valor</TableHead>
              <TableHead className="w-20 text-right text-xs">Pago</TableHead>
              <TableHead className="w-24 text-right text-xs">Saldo</TableHead>
              <TableHead className="w-24 text-center text-xs">Status</TableHead>
              {canRegisterPagamento && <TableHead className="w-[180px] text-center text-xs">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Nenhuma parcela encontrada</TableCell></TableRow>
            ) : (
              filtered.map((p) => {
                const isOverdue = p.status === "vencida" || (["pendente", "parcial"].includes(p.status) && p.vencimento < todayISO);
                const isPaga = p.status === "paga";
                const isParcial = p.status === "parcial";
                let latestPaymentDateStr = p.data_pagamento;
                if ((p as any).pagamentos?.length > 0) {
                  const arr = (p as any).pagamentos as { data_pagamento: string }[];
                  latestPaymentDateStr = arr.reduce((acc, curr) => curr.data_pagamento > acc ? curr.data_pagamento : acc, arr[0].data_pagamento);
                }
                const paymentDateDisplay = latestPaymentDateStr && (isPaga || isParcial)
                  ? format(new Date(latestPaymentDateStr), "dd/MM/yy", { locale: ptBR }) : "—";
                const cfg = isOverdue ? STATUS_CFG.vencida : (STATUS_CFG[p.status] ?? STATUS_CFG.pendente);
                const Icon = cfg.icon;
                const isSelected = selectedIds.has(p.id);
                return (
                  <TableRow key={p.id} className={isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}>
                    {canRegisterPagamento && (
                      <TableCell>
                        {!isPaga && (
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(p.id, p.status)} aria-label={`Selecionar parcela ${p.numero}`} />
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-xs text-center">{p.numero}ª</TableCell>
                    <TableCell><p className="truncate text-xs font-semibold max-w-[200px]">{(p as any).clientes?.nome ?? "—"}</p></TableCell>
                    <TableCell className="text-xs">{format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">{paymentDateDisplay}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(Number(p.valor_total))}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(Number(p.valor_pago))}</TableCell>
                    <TableCell className="text-right font-semibold text-xs text-destructive">{fmt(Number(p.saldo))}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cfg.variant} className="gap-1 text-[10px] py-0"><Icon className="w-3 h-3" />{cfg.label}</Badge>
                    </TableCell>
                    {canRegisterPagamento && (
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {p.status !== "paga" && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setPagamentoState({ open: true, data: p })}>
                              <CreditCard className="w-3 h-3 mr-1" /> Pagar
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setReciboState({ open: true, data: p })}>
                            <Receipt className="w-3 h-3" />
                          </Button>
                          {(p.venda_id || (p as any).vendas?.id) && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-primary" onClick={() => setVendaDetailId(p.venda_id || (p as any).vendas?.id)}>
                              <ShoppingBag className="w-3 h-3" />
                            </Button>
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

      {/* ── Painel de seleção múltipla (sticky bottom bar) ── */}
      {selectedIds.size > 0 && canRegisterPagamento && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,600px)] animate-in slide-in-from-bottom-4">
          <div className="rounded-xl border bg-card shadow-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <ListChecks className="w-5 h-5 text-primary shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">{selectedIds.size} parcela{selectedIds.size > 1 ? "s" : ""}</span>{" "}
                selecionada{selectedIds.size > 1 ? "s" : ""} ·{" "}
                <span className="font-bold text-destructive">{fmt(saldoSelecionado)}</span> em saldo
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={clearSelection} className="gap-1">
                <X className="w-3 h-3" /> Limpar
              </Button>
              <Button size="sm" onClick={() => setLoteOpen(true)} className="gap-1 flex-1 sm:flex-none">
                <CreditCard className="w-3 h-3" /> Pagar Selecionadas
              </Button>
            </div>
          </div>
        </div>
      )}

      <Drawer open={!!mobileParcela} onOpenChange={(open) => !open && setMobileParcela(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Ações do fiado</DrawerTitle>
          </DrawerHeader>
          {mobileParcela && (
            <div className="space-y-4 overflow-y-auto px-4 pb-5">
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{(mobileParcela as any).clientes?.nome ?? "Cliente não informado"}</p>
                      <p className="text-xs text-muted-foreground">Parcela {mobileParcela.numero}ª</p>
                    </div>
                    {(() => {
                      const cfg = STATUS_CFG[mobileParcela.status] ?? STATUS_CFG.pendente;
                      const StatusIcon = cfg.icon;
                      return (
                        <Badge variant={cfg.variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p>Vencimento</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(mobileParcela.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {(() => {
                      const isMobilePaga = mobileParcela.status === "paga" || mobileParcela.status === "parcial";
                      let mLatest = mobileParcela.data_pagamento;
                      if (mobileParcela.pagamentos && mobileParcela.pagamentos.length > 0) {
                        const mArr = mobileParcela.pagamentos as { data_pagamento: string }[];
                        mLatest = mArr.reduce((acc, curr) => curr.data_pagamento > acc ? curr.data_pagamento : acc, mArr[0].data_pagamento);
                      }
                      if (!isMobilePaga || !mLatest) return null;
                      return (
                        <div>
                          <p>Pago em</p>
                          <p className="font-medium text-foreground">
                            {format(new Date(mLatest), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      );
                    })()}
                    <div>
                      <p>Saldo</p>
                      <p className="font-semibold text-foreground">{fmt(Number(mobileParcela.saldo))}</p>
                    </div>
                    <div>
                      <p>Valor</p>
                      <p className="font-medium text-foreground">{fmt(Number(mobileParcela.valor_total))}</p>
                    </div>
                    <div>
                      <p>Pago</p>
                      <p className="font-medium text-foreground">{fmt(Number(mobileParcela.valor_pago))}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileParcela(null); setDetailState({ open: true, data: mobileParcela }); }}>
                  <Eye className="w-4 h-4" /> Ver fiado
                </Button>

                {canRegisterPagamento && mobileParcela.status !== "paga" && (
                  <>
                    <Button 
                      className="w-full justify-start gap-2" 
                      variant={selectedIds.has(mobileParcela.id) ? "secondary" : "outline"} 
                      onClick={() => { 
                        toggleSelect(mobileParcela.id, mobileParcela.status);
                        setMobileParcela(null);
                      }}
                    >
                      <ListChecks className="w-4 h-4 text-primary" /> 
                      {selectedIds.has(mobileParcela.id) ? "Remover da seleção" : "Selecionar para pagamento em lote"}
                    </Button>

                    <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileParcela(null); setPagamentoState({ open: true, data: mobileParcela }); }}>
                      <CreditCard className="w-4 h-4" /> Registrar recebimento único
                    </Button>
                  </>
                )}

                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileParcela(null); setReciboState({ open: true, data: mobileParcela }); }}>
                  <Receipt className="w-4 h-4" /> Gerar recibo
                </Button>

                { (mobileParcela.venda_id || (mobileParcela as any).vendas?.id) && (
                  <Button 
                    className="w-full justify-start gap-2" 
                    variant="outline" 
                    onClick={() => navigate(`/vendas?viewVenda=${mobileParcela.venda_id || (mobileParcela as any).vendas?.id}`)}
                  >
                    <ShoppingBag className="w-4 h-4" /> Ver venda de origem
                  </Button>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Sheet open={detailState.open} onOpenChange={(open) => setDetailState((prev) => ({ ...prev, open }))}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalhes do Fiado</SheetTitle>
          </SheetHeader>
          {detailState.data && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> {(detailState.data as any).clientes?.nome ?? "—"}</div>
                <div><span className="text-muted-foreground">Parcela:</span> {detailState.data.numero}ª</div>
                <div>
                  <span className="text-muted-foreground">Vencimento:</span>{" "}
                  {format(new Date(detailState.data.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                </div>
                {(() => {
                  const mData = detailState.data as any;
                  const isMobilePaga = mData.status === "paga" || mData.status === "parcial";
                  let mLatest = mData.data_pagamento;
                  if (mData.pagamentos && mData.pagamentos.length > 0) {
                    const mArr = mData.pagamentos as { data_pagamento: string }[];
                    mLatest = mArr.reduce((acc, curr) => curr.data_pagamento > acc ? curr.data_pagamento : acc, mArr[0].data_pagamento);
                  }
                  if (!isMobilePaga || !mLatest) return null;
                  return (
                    <div>
                      <span className="text-muted-foreground">Pago em:</span>{" "}
                      {format(new Date(mLatest), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  );
                })()}
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={STATUS_CFG[detailState.data.status]?.variant ?? "outline"}>
                    {STATUS_CFG[detailState.data.status]?.label ?? detailState.data.status}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-3 text-center">
                <Card className="p-3"><p className="text-xs text-muted-foreground">Valor</p><p className="text-sm font-semibold text-foreground">{fmt(Number(detailState.data.valor_total))}</p></Card>
                <Card className="p-3"><p className="text-xs text-muted-foreground">Pago</p><p className="text-sm font-semibold text-primary">{fmt(Number(detailState.data.valor_pago))}</p></Card>
                <Card className="p-3"><p className="text-xs text-muted-foreground">Saldo</p><p className="text-sm font-semibold text-destructive">{fmt(Number(detailState.data.saldo))}</p></Card>
              </div>
              <div className="space-y-2">
                {canRegisterPagamento && detailState.data.status !== "paga" && (
                  <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setDetailState({ open: false }); setPagamentoState({ open: true, data: detailState.data }); }}>
                    <CreditCard className="w-4 h-4" /> Registrar recebimento
                  </Button>
                )}
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setDetailState({ open: false }); setReciboState({ open: true, data: detailState.data }); }}>
                  <Receipt className="w-4 h-4" /> Gerar recibo
                </Button>
                {(detailState.data.venda_id || (detailState.data as any).vendas?.id) && (
                  <Button 
                    className="w-full justify-start gap-2" 
                    variant="outline" 
                    onClick={() => setVendaDetailId(detailState.data.venda_id || (detailState.data as any).vendas?.id)}
                  >
                    <ShoppingBag className="w-4 h-4" /> Ver venda de origem
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <GerarParcelasForm open={gerarOpen} onOpenChange={setGerarOpen} />
      <PagamentoForm
        open={pagamentoState.open}
        onOpenChange={(open) => setPagamentoState((prev) => ({ ...prev, open }))}
        parcela={pagamentoState.data}
      />
      <PagamentoLoteForm
        open={loteOpen}
        onOpenChange={setLoteOpen}
        parcelas={parcelasSelecionadas}
        onSuccess={clearSelection}
      />
      <ReciboParcela
        open={reciboState.open}
        onOpenChange={(open) => setReciboState((prev) => ({ ...prev, open }))}
        parcela={reciboState.data}
      />

      <DetalheVendaSheet 
        vendaId={vendaDetailId}
        open={!!vendaDetailId}
        onOpenChange={(open) => !open && setVendaDetailId(null)}
      />
    </div>
  );
}
