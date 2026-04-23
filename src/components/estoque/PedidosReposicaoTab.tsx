import { useState } from "react";
import { normalizeSearch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Send, PackageCheck, XCircle, Eye, Pencil } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileRowActions, mobileRowProps } from "@/components/layout/MobileRowActions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  usePedidosReposicao,
  useFinalizarPedidoReposicao,
  useCancelarPedidoReposicao,
  usePedidoReposicaoDetalhes,
  type PedidoReposicao,
} from "@/hooks/usePedidosReposicao";
import { useEmpresas } from "@/hooks/useEmpresas";
import { gerarPdfReposicao } from "@/lib/reposicaoPdf";
import { PedidoReposicaoForm } from "./PedidoReposicaoForm";
import { RecebimentoForm } from "./RecebimentoForm";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  finalizado: { label: "Finalizado", variant: "default" },
  recebido_parcial: { label: "Rec. Parcial", variant: "secondary" },
  recebido: { label: "Recebido", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function PedidosReposicaoTab() {
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [recebimentoId, setRecebimentoId] = useState<string | null>(null);
  const [mobileItem, setMobileItem] = useState<PedidoReposicao | null>(null);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);

  const { data: pedidos, isLoading } = usePedidosReposicao(statusFilter);
  const { data: empresas } = useEmpresas();
  const finalizarMut = useFinalizarPedidoReposicao();
  const cancelarMut = useCancelarPedidoReposicao();
  const { data: detalhes } = usePedidoReposicaoDetalhes(detalhesId);

  const empresaNome = empresas?.[0]?.nome ?? "";

  const filtered = pedidos?.filter((p) =>
    normalizeSearch(p.fornecedor_nome ?? "").includes(normalizeSearch(search)) ||
    String(p.numero).includes(search)
  );

  const handlePdf = async (pedido: PedidoReposicao) => {
    // Need full details with items for PDF
    const { data } = await (await import("@/integrations/supabase/client")).supabase
      .from("pedidos_reposicao" as any)
      .select("*")
      .eq("id", pedido.id)
      .single();
    const { data: itens } = await (await import("@/integrations/supabase/client")).supabase
      .from("itens_pedido_reposicao" as any)
      .select("*, produtos(nome, codigo, unidade, imagem_url)")
      .eq("pedido_reposicao_id", pedido.id);

    if (data) {
      const pedidoData = data as any;
      pedidoData.itens_pedido_reposicao = itens;
      await gerarPdfReposicao(pedidoData as PedidoReposicao, empresaNome);
    }
  };

  const openEdit = (p: PedidoReposicao) => {
    setEditId(p.id);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setFormOpen(true);
  };

  const renderActions = (p: PedidoReposicao, closeMobile?: () => void) => {
    const close = () => closeMobile?.();
    return (
      <div className="space-y-2">
        {p.status === "rascunho" && (
          <>
            <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { openEdit(p); close(); }}>
              <Pencil className="w-4 h-4" /> Editar
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { finalizarMut.mutate(p.id); close(); }}>
              <Send className="w-4 h-4" /> Finalizar / Enviar
            </Button>
          </>
        )}
        {(p.status === "finalizado" || p.status === "recebido_parcial") && (
          <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setRecebimentoId(p.id); close(); }}>
            <PackageCheck className="w-4 h-4" /> Confirmar Recebimento
          </Button>
        )}
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { handlePdf(p); close(); }}>
          <FileText className="w-4 h-4" /> Gerar PDF
        </Button>
        {p.status !== "cancelado" && p.status !== "recebido" && (
          <Button className="w-full justify-start gap-2 text-destructive" variant="outline" onClick={() => { cancelarMut.mutate(p.id); close(); }}>
            <XCircle className="w-4 h-4" /> Cancelar
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="recebido_parcial">Rec. Parcial</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isMobile && (
        <p className="px-1 text-xs text-muted-foreground">Toque em um pedido para ver ações.</p>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
              {!isMobile && <TableHead className="text-right">Itens</TableHead>}
              {!isMobile && <TableHead className="text-right">Valor</TableHead>}
              {!isMobile && <TableHead>Data</TableHead>}
              {!isMobile && <TableHead>Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isMobile ? 3 : 7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={isMobile ? 3 : 7} className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</TableCell></TableRow>
            ) : (
              filtered.map((p) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.rascunho;
                return (
                  <TableRow
                    key={p.id}
                    {...mobileRowProps(isMobile, () => setMobileItem(p), `Ações do pedido ${p.numero}`)}
                  >
                    <TableCell className="font-medium">{p.numero}</TableCell>
                    <TableCell className="text-sm">{p.fornecedor_nome || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    {!isMobile && <TableCell className="text-right">{p.total_itens}</TableCell>}
                    {!isMobile && <TableCell className="text-right">R$ {Number(p.total_valor).toFixed(2)}</TableCell>}
                    {!isMobile && (
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <div className="flex gap-1">
                          {p.status === "rascunho" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)} title="Editar">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => finalizarMut.mutate(p.id)} title="Finalizar">
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {(p.status === "finalizado" || p.status === "recebido_parcial") && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRecebimentoId(p.id)} title="Receber">
                              <PackageCheck className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePdf(p)} title="PDF">
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          {p.status !== "cancelado" && p.status !== "recebido" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cancelarMut.mutate(p.id)} title="Cancelar">
                              <XCircle className="w-3.5 h-3.5 text-destructive" />
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

      {/* Mobile drawer */}
      <MobileRowActions
        open={isMobile && !!mobileItem}
        onOpenChange={(open) => !open && setMobileItem(null)}
        title={`Pedido #${mobileItem?.numero}`}
        summary={mobileItem && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{mobileItem.fornecedor_nome || "Sem fornecedor"}</span>
              <Badge variant={STATUS_CONFIG[mobileItem.status]?.variant ?? "outline"}>
                {STATUS_CONFIG[mobileItem.status]?.label ?? mobileItem.status}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <p>Itens</p>
                <p className="font-semibold text-foreground">{mobileItem.total_itens}</p>
              </div>
              <div>
                <p>Valor</p>
                <p className="font-semibold text-foreground">R$ {Number(mobileItem.total_valor).toFixed(2)}</p>
              </div>
              <div>
                <p>Data</p>
                <p className="font-medium text-foreground">{format(new Date(mobileItem.created_at), "dd/MM/yy", { locale: ptBR })}</p>
              </div>
            </div>
          </div>
        )}
      >
        {mobileItem && renderActions(mobileItem, () => setMobileItem(null))}
      </MobileRowActions>

      <PedidoReposicaoForm open={formOpen} onOpenChange={setFormOpen} editId={editId} />
      <RecebimentoForm open={!!recebimentoId} onOpenChange={(o) => !o && setRecebimentoId(null)} pedidoId={recebimentoId} />
    </div>
  );
}
