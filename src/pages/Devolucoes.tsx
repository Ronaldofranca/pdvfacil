import { useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, Plus, Filter, ArrowUpRight, ArrowDownLeft, Package, MoreVertical, Eye, FileText, Printer, ShoppingBag } from "lucide-react";
import { normalizeSearch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useDevolucoes, useSaldoGlobalCreditos } from "@/hooks/useDevolucoes";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovaDevolucaoDialog } from "@/components/devolucoes/NovaDevolucaoDialog";
import { DetalheDevolucaoDialog } from "@/components/devolucoes/DetalheDevolucaoDialog";
import { ReciboCredito } from "@/components/devolucoes/ReciboCredito";
import { DetalheVendaSheet } from "@/components/vendas/DetalheVendaSheet";

export default function DevolucoesPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: devolucoes, isLoading } = useDevolucoes();
  const [search, setSearch, clearSearch] = usePersistentState("search", "", "devolucoes");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reciboOpen, setReciboOpen] = useState(false);
  const [selectedForReceipt, setSelectedForReceipt] = useState<any>(null);
  const [vendaDetailId, setVendaDetailId] = useState<string | null>(null);

  const filtered = devolucoes?.filter(d =>
    normalizeSearch((d as any).clientes?.nome ?? "").includes(normalizeSearch(search)) ||
    d.venda_id.toLowerCase().includes(search.toLowerCase()) ||
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  const { data: saldoGlobal } = useSaldoGlobalCreditos();

  const totalDevolvido = devolucoes?.reduce((s, h) => s + Number(h.valor_total_devolvido), 0) || 0;
  const totalAbatido = devolucoes?.reduce((s, h) => s + Number(h.valor_abatido_parcelas || 0), 0) || 0;
  const totalCredito = devolucoes?.reduce((s, h) => s + Number(h.valor_credito_gerado || 0), 0) || 0;
  const impactoFinanceiro = totalAbatido + totalCredito;

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
            <RefreshCw className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Devoluções</h1>
            <p className="text-sm text-muted-foreground">Histórico de trocas e devoluções</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Nova Devolução
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Total Devolvido</p>
          <p className="text-2xl font-bold">{fmt(totalDevolvido)}</p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <ArrowUpRight className="w-3 h-3" /> Bruto total das movimentações
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Quantidade</p>
          <p className="text-2xl font-bold">{devolucoes?.length || 0}</p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <Package className="w-3 h-3" /> Registros de devolução operados
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Saldo de Créditos</p>
          <p className="text-2xl font-bold text-green-600">{fmt(saldoGlobal || 0)}</p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <ArrowDownLeft className="w-3 h-3" /> Total em haver com todos os clientes
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-20 bg-card"
            placeholder="Buscar por cliente, venda ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              Limpar
            </Button>
          )}
        </div>
        <Button variant="outline" size="icon" className="shrink-0 bg-card">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <Card className="overflow-hidden border-sidebar-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Devolução</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Venda Original</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor Devolvido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin opacity-20" />
                    <p className="text-sm">Carregando histórico...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 opacity-10" />
                    <p className="text-sm">Nenhuma devolução registrada.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    #{d.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {(d as any).clientes?.nome ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    #{d.venda_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(d.data_devolucao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">
                    {fmt(Number(d.valor_total_devolvido))}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] font-bold uppercase tracking-wider">
                      Aplicada
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Ver Detalhes"
                        onClick={() => { setSelectedId(d.id); setDetailOpen(true); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                        title="Imprimir Recibo"
                        onClick={() => { setSelectedForReceipt(d); setReciboOpen(true); }}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary hover:bg-primary/5"
                        title="Ver Venda Original"
                        onClick={() => setVendaDetailId(d.venda_id)}
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <NovaDevolucaoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      
      <DetalheDevolucaoDialog 
        id={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <ReciboCredito 
        open={reciboOpen}
        onOpenChange={setReciboOpen}
        devolucao={selectedForReceipt}
        cliente={selectedForReceipt?.clientes}
        valorCredito={Number(selectedForReceipt?.valor_credito_gerado || 0)}
      />

      <DetalheVendaSheet 
        vendaId={vendaDetailId}
        open={!!vendaDetailId}
        onOpenChange={(o) => !o && setVendaDetailId(null)}
      />
    </div>
  );
}
