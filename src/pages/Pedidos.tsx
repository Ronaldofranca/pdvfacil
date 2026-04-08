import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Plus, Eye, Truck, ShoppingCart, CheckCircle, XCircle, CalendarClock, Filter, Globe, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { usePedidos, usePedidoItens, useAtualizarStatusPedido, type StatusPedido } from "@/hooks/usePedidos";
import { PDVModal } from "@/components/vendas/PDVModal";
import { PedidoForm } from "@/components/pedidos/PedidoForm";
import { ReciboPedido } from "@/components/pedidos/ReciboPedido";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileRowActions, mobileRowProps } from "@/components/layout/MobileRowActions";
import { useFinalizarVenda, type CartItem } from "@/hooks/useVendas";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fmtR } from "@/lib/reportExport";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  rascunho: { label: "Rascunho", variant: "outline", color: "text-muted-foreground" },
  aguardando_entrega: { label: "Aguardando", variant: "secondary", color: "text-yellow-600" },
  em_rota: { label: "Em Rota", variant: "default", color: "text-blue-600" },
  entregue: { label: "Entregue", variant: "default", color: "text-primary" },
  cancelado: { label: "Cancelado", variant: "destructive", color: "text-destructive" },
  convertido_em_venda: { label: "Convertido", variant: "default", color: "text-primary" },
};

export default function PedidosPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile, user } = useAuth();
  const atualizarStatus = useAtualizarStatusPedido();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editPedidoId, setEditPedidoId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pdvState, setPdvState] = useState<{ open: boolean; cart?: CartItem[]; clienteId?: string; pedidoId?: string }>({ open: false });
  const [mobileItem, setMobileItem] = useState<any | null>(null);
  const [receiptPedido, setReceiptPedido] = useState<any | null>(null);

  const filtros = statusFilter !== "todos" ? { status: statusFilter as StatusPedido } : undefined;
  const { data: pedidos, isLoading } = usePedidos(filtros);
  const { data: itensDetail } = usePedidoItens(detailId);
  const pedidoDetail = pedidos?.find((p) => p.id === detailId);

  const hoje = new Date().toISOString().split("T")[0];

  const filtered = pedidos?.filter((p) =>
    p.clientes?.nome?.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
  );

  const handleEdit = (pedido: any) => {
    setEditPedidoId(pedido.id);
    setFormOpen(true);
    setMobileItem(null);
    setDetailId(null);
  };

  const handleNewOrder = () => {
    setEditPedidoId(null);
    setFormOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const st = STATUS_MAP[status] ?? STATUS_MAP.rascunho;
    return <Badge variant={st.variant}>{st.label}</Badge>;
  };

  const getEntregaBadge = (data: string) => {
    if (data < hoje) return <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>;
    if (data === hoje) return <Badge variant="default" className="text-[10px]">Hoje</Badge>;
    const amanha = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    if (data === amanha) return <Badge variant="secondary" className="text-[10px]">Amanhã</Badge>;
    return null;
  };

  const isPortalOrder = (obs?: string) => !!obs && obs.toLowerCase().includes("pedido feito pelo portal");

  const converterEmVenda = (pedido: typeof pedidoDetail) => {
    if (!pedido || !itensDetail) return;
    const cart: CartItem[] = itensDetail.map((i) => ({
      line_id: `pedido_${i.id ?? crypto.randomUUID()}`,
      produto_id: i.produto_id,
      nome: i.nome_produto,
      quantidade: Number(i.quantidade),
      preco_original: Number(i.preco_original),
      preco_vendido: Number(i.preco_pedido),
      desconto: Number(i.desconto),
      bonus: i.bonus,
      subtotal: Number(i.subtotal),
      custo_unitario: Number(i.produtos?.custo ?? 0),
    }));
    setPdvState({ open: true, cart, clienteId: pedido.cliente_id, pedidoId: pedido.id });
    setDetailId(null);
  };

  const handlePdvClose = (open: boolean) => {
    setPdvState({ open });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
            <p className="text-sm text-muted-foreground">Gerenciar pedidos e entregas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/agenda-entregas")} className="gap-1.5">
            <CalendarClock className="w-4 h-4" /> Agenda
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleNewOrder}>
            <Plus className="w-4 h-4" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente ou ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="aguardando_entrega">Aguardando</SelectItem>
            <SelectItem value="em_rota">Em Rota</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="convertido_em_venda">Convertido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isMobile && (
        <p className="px-1 text-xs text-muted-foreground">
          Toque em um pedido para abrir ações rápidas.
        </p>
      )}

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {!isMobile && <TableHead>ID</TableHead>}
              <TableHead>Cliente</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              {!isMobile && <TableHead className="w-32" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isMobile ? 4 : 6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={isMobile ? 4 : 6} className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  {...mobileRowProps(isMobile, () => setMobileItem(p), `Abrir ações do pedido ${p.id.slice(0, 8)}`)}
                >
                  {!isMobile && <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>}
                  <TableCell className="font-medium">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate">{p.clientes?.nome ?? "—"}</p>
                        {isPortalOrder(p.observacoes) && (
                          <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20 gap-1 px-1.5 hidden sm:inline-flex">
                            <Globe className="w-3 h-3" /> Portal
                          </Badge>
                        )}
                      </div>
                      {isMobile && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">#{p.id.slice(0, 8)}</p>
                          {isPortalOrder(p.observacoes) && (
                            <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20 gap-1 px-1.5">
                              <Globe className="w-2 h-2" /> Portal
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{format(new Date(p.data_prevista_entrega + "T12:00:00"), "dd/MM/yy")}</span>
                      {["rascunho", "aguardando_entrega", "em_rota"].includes(p.status) && getEntregaBadge(p.data_prevista_entrega)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmtR(Number(p.valor_total))}</TableCell>
                  <TableCell>{getStatusBadge(p.status)}</TableCell>
                  {!isMobile && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailId(p.id)} title="Ver detalhes">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setReceiptPedido(p)} title="Imprimir Recibo">
                          <Printer className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {["rascunho", "aguardando_entrega"].includes(p.status) && (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} title="Editar Pedido">
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                        {p.status === "rascunho" && (
                          <Button variant="ghost" size="icon" onClick={() => atualizarStatus.mutate({ id: p.id, status: "aguardando_entrega" })} title="Confirmar">
                            <CheckCircle className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        {p.status === "aguardando_entrega" && (
                          <Button variant="ghost" size="icon" onClick={() => atualizarStatus.mutate({ id: p.id, status: "em_rota" })} title="Em rota">
                            <Truck className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile pedido actions drawer */}
      <MobileRowActions
        open={isMobile && !!mobileItem}
        onOpenChange={(open) => !open && setMobileItem(null)}
        title="Ações do pedido"
        summary={mobileItem && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  {mobileItem.clientes?.nome ?? "—"}
                  {isPortalOrder(mobileItem.observacoes) && <Globe className="w-3 h-3 text-primary" />}
                </p>
                <p className="text-xs text-muted-foreground">Pedido #{mobileItem.id.slice(0, 8)}</p>
              </div>
              {getStatusBadge(mobileItem.status)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <p>Entrega</p>
                <p className="font-medium text-foreground">{format(new Date(mobileItem.data_prevista_entrega + "T12:00:00"), "dd/MM/yyyy")}</p>
              </div>
              <div>
                <p>Total</p>
                <p className="font-semibold text-foreground">{fmtR(Number(mobileItem.valor_total))}</p>
              </div>
            </div>
          </div>
        )}
      >
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); setDetailId(mobileItem.id); }}>
          <Eye className="w-4 h-4" /> Ver detalhes
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setReceiptPedido(mobileItem); setMobileItem(null); }}>
          <Printer className="w-4 h-4" /> Imprimir Recibo
        </Button>
        {["rascunho", "aguardando_entrega"].includes(mobileItem?.status) && (
          <Button className="w-full justify-start gap-2" variant="outline" onClick={() => handleEdit(mobileItem)}>
            <Pencil className="w-4 h-4" /> Editar Pedido
          </Button>
        )}
        {mobileItem?.status === "rascunho" && (
          <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); atualizarStatus.mutate({ id: mobileItem.id, status: "aguardando_entrega" }); }}>
            <CheckCircle className="w-4 h-4 text-primary" /> Confirmar pedido
          </Button>
        )}
        {mobileItem?.status === "aguardando_entrega" && (
          <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); atualizarStatus.mutate({ id: mobileItem.id, status: "em_rota" }); }}>
            <Truck className="w-4 h-4 text-blue-600" /> Marcar em rota
          </Button>
        )}
        {(mobileItem?.status === "em_rota" || mobileItem?.status === "aguardando_entrega") && (
          <>
            <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); atualizarStatus.mutate({ id: mobileItem.id, status: "entregue" }); }}>
              <CheckCircle className="w-4 h-4" /> Marcar entregue
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); setDetailId(mobileItem.id); }}>
              <ShoppingCart className="w-4 h-4" /> Converter em venda
            </Button>
          </>
        )}
        {["rascunho", "aguardando_entrega"].includes(mobileItem?.status) && (
          <Button className="w-full justify-start gap-2" variant="destructive" onClick={() => { setMobileItem(null); atualizarStatus.mutate({ id: mobileItem.id, status: "cancelado" }); }}>
            <XCircle className="w-4 h-4" /> Cancelar pedido
          </Button>
        )}
      </MobileRowActions>

      {/* Form */}
      <PedidoForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        pedidoId={editPedidoId}
        initialData={editPedidoId ? (pedidos?.find(p => p.id === editPedidoId)) : null}
      />

      {/* PDV for conversion */}
      <PDVModal
        open={pdvState.open}
        onOpenChange={handlePdvClose}
        initialCart={pdvState.cart}
        initialClienteId={pdvState.clienteId}
        onFinalize={() => {
          if (pdvState.pedidoId) {
            atualizarStatus.mutate({ id: pdvState.pedidoId, status: "convertido_em_venda" });
          }
        }}
      />

      {/* Recibo modal */}
      <ReciboPedido 
        open={!!receiptPedido}
        onOpenChange={(o) => !o && setReceiptPedido(null)}
        pedido={receiptPedido}
      />

      {/* Detail Sheet */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Pedido</SheetTitle>
          </SheetHeader>
          {pedidoDetail && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{pedidoDetail.id.slice(0, 8)}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {getStatusBadge(pedidoDetail.status)}</div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-muted-foreground">Cliente:</span> {pedidoDetail.clientes?.nome ?? "—"}
                  {isPortalOrder(pedidoDetail.observacoes) && (
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-1">
                      <Globe className="w-3 h-3" /> Via Portal
                    </Badge>
                  )}
                </div>
                <div><span className="text-muted-foreground">Data Pedido:</span> {format(new Date(pedidoDetail.data_pedido), "dd/MM/yyyy", { locale: ptBR })}</div>
                <div><span className="text-muted-foreground">Entrega:</span> {format(new Date(pedidoDetail.data_prevista_entrega + "T12:00:00"), "dd/MM/yyyy")}</div>
                {pedidoDetail.horario_entrega && <div><span className="text-muted-foreground">Horário:</span> {pedidoDetail.horario_entrega}</div>}
              </div>

              {pedidoDetail.clientes && (
                <>
                  <Separator />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">Endereço de Entrega</p>
                    <p className="text-muted-foreground">
                      {[pedidoDetail.clientes.rua, pedidoDetail.clientes.bairro, pedidoDetail.clientes.cidade, pedidoDetail.clientes.estado].filter(Boolean).join(", ")}
                    </p>
                    {pedidoDetail.clientes.telefone && <p className="text-muted-foreground">📞 {pedidoDetail.clientes.telefone}</p>}
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Itens</p>
                {itensDetail?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm p-2 rounded border">
                    <div>
                      <p className="font-medium">{item.nome_produto}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(item.quantidade)}x {fmtR(Number(item.preco_pedido))}
                        {item.bonus && " (Bônus)"}
                        {Number(item.desconto) > 0 && ` -${fmtR(Number(item.desconto))}`}
                      </p>
                    </div>
                    <span className="font-medium">{fmtR(Number(item.subtotal))}</span>
                  </div>
                ))}
              </div>

              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtR(Number(pedidoDetail.subtotal))}</span></div>
                {Number(pedidoDetail.desconto_total) > 0 && (
                  <div className="flex justify-between text-destructive"><span>Descontos</span><span>-{fmtR(Number(pedidoDetail.desconto_total))}</span></div>
                )}
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{fmtR(Number(pedidoDetail.valor_total))}</span></div>
              </div>

              {pedidoDetail.observacoes && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{pedidoDetail.observacoes}</p>
                </>
              )}

              {/* Action buttons */}
              <Separator />
              <div className="space-y-2">
                <Button className="w-full gap-2" variant="outline" onClick={() => setReceiptPedido(pedidoDetail)}>
                  <Printer className="w-4 h-4" /> Imprimir Recibo
                </Button>
                {["rascunho", "aguardando_entrega"].includes(pedidoDetail.status) && (
                  <Button className="w-full gap-2" variant="outline" onClick={() => handleEdit(pedidoDetail)}>
                    <Pencil className="w-4 h-4" /> Editar Pedido
                  </Button>
                )}
                {pedidoDetail.status === "rascunho" && (
                  <Button className="w-full gap-2" onClick={() => { atualizarStatus.mutate({ id: pedidoDetail.id, status: "aguardando_entrega" }); setDetailId(null); }}>
                    <CheckCircle className="w-4 h-4" /> Confirmar Pedido
                  </Button>
                )}
                {pedidoDetail.status === "aguardando_entrega" && (
                  <Button className="w-full gap-2" onClick={() => { atualizarStatus.mutate({ id: pedidoDetail.id, status: "em_rota" }); setDetailId(null); }}>
                    <Truck className="w-4 h-4" /> Marcar Em Rota
                  </Button>
                )}
                {(pedidoDetail.status === "em_rota" || pedidoDetail.status === "aguardando_entrega") && (
                  <>
                    <Button className="w-full gap-2" variant="default" onClick={() => { atualizarStatus.mutate({ id: pedidoDetail.id, status: "entregue" }); setDetailId(null); }}>
                      <CheckCircle className="w-4 h-4" /> Marcar como Entregue
                    </Button>
                    <Button className="w-full gap-2" variant="outline" onClick={() => converterEmVenda(pedidoDetail)}>
                      <ShoppingCart className="w-4 h-4" /> Converter em Venda
                    </Button>
                  </>
                )}
                {["rascunho", "aguardando_entrega"].includes(pedidoDetail.status) && (
                  <Button className="w-full gap-2" variant="destructive" onClick={() => { atualizarStatus.mutate({ id: pedidoDetail.id, status: "cancelado" }); setDetailId(null); }}>
                    <XCircle className="w-4 h-4" /> Cancelar Pedido
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
