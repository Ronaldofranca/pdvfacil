import { useState } from "react";
import { ShoppingCart, Search, Plus, Eye, XCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useVendas, useVendaItens, useCancelarVenda } from "@/hooks/useVendas";
import { usePermissions } from "@/hooks/usePermissions";
import { PDVModal } from "@/components/vendas/PDVModal";
import { ReciboVenda } from "@/components/vendas/ReciboVenda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  pendente: { label: "Pendente", variant: "secondary" },
  finalizada: { label: "Finalizada", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

export default function VendasPage() {
  const { canCreateVenda, isAdmin } = usePermissions();
  const { data: vendas, isLoading } = useVendas();
  const cancelar = useCancelarVenda();

  const [pdvOpen, setPdvOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reciboVenda, setReciboVenda] = useState<any>(null);
  const { data: itensDetail } = useVendaItens(detailId);

  const vendaDetail = vendas?.find((v) => v.id === detailId);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = vendas?.filter((v) =>
    (v as any).clientes?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    v.id.includes(search)
  );

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por cliente ou ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>
            ) : (
              filtered.map((v) => {
                const st = STATUS_MAP[v.status] ?? STATUS_MAP.rascunho;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{(v as any).clientes?.nome ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(v.data_venda), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(Number(v.total))}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailId(v.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setReciboVenda(v)} title="Recibo">
                          <Receipt className="w-4 h-4" />
                        </Button>
                        {isAdmin && v.status === "finalizada" && (
                          <Button variant="ghost" size="icon" onClick={() => cancelar.mutate(v.id)}>
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* PDV */}
      <PDVModal open={pdvOpen} onOpenChange={setPdvOpen} />

      {/* Recibo de Venda */}
      <ReciboVenda
        open={!!reciboVenda}
        onOpenChange={(o) => !o && setReciboVenda(null)}
        venda={reciboVenda}
      />

      {/* Detalhes da venda */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
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
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Itens</p>
                {itensDetail?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm p-2 rounded border">
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
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{fmt(Number(vendaDetail.total))}</span></div>
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

              {/* Quick receipt button in detail view */}
              <Separator />
              <Button variant="outline" className="w-full gap-1.5" onClick={() => { setDetailId(null); setReciboVenda(vendaDetail); }}>
                <Receipt className="w-4 h-4" /> Gerar Recibo
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
