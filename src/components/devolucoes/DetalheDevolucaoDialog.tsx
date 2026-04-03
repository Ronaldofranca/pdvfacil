import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Package, ArrowRight, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useDevolucao } from "@/hooks/useDevolucoes";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetalheDevolucaoDialogProps {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetalheDevolucaoDialog({ id, open, onOpenChange }: DetalheDevolucaoDialogProps) {
  const { data: devolucao, isLoading } = useDevolucao(id);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            Detalhes da Devolução
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin opacity-20" />
            <p className="text-sm italic">Carregando detalhes...</p>
          </div>
        ) : !devolucao ? (
          <div className="py-20 text-center text-muted-foreground">
            <p>Devolução não encontrada.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">ID Devolução</p>
                  <p className="font-mono text-xs">#{devolucao.id}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Data/Hora Registro</p>
                  <p>{format(new Date(devolucao.data_devolucao), "dd/MM/yyyy HH:mm")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{devolucao.clientes?.nome || "Consumidor"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Venda Original</p>
                  <p className="font-mono text-xs">#{devolucao.venda_id.slice(0, 8)}</p>
                </div>
              </div>

              <Separator />

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4" /> Itens Devolvidos
                </h3>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold uppercase">Produto</TableHead>
                        <TableHead className="text-center text-[10px] font-bold uppercase">Qtd</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase">Preço</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devolucao.itens_devolucao?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">
                            {item.produtos?.nome || item.produto?.nome || "Produto"}
                          </TableCell>
                          <TableCell className="text-center text-xs">{Number(item.quantidade)}</TableCell>
                          <TableCell className="text-right text-xs">{fmt(Number(item.valor_unitario))}</TableCell>
                          <TableCell className="text-right text-xs font-bold">
                            {fmt(Number(item.quantidade) * Number(item.valor_unitario))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Financial Impact Summary */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider">Impacto Financeiro</h3>
                <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-sm">Total Bruto Devolvido</span>
                    <span className="text-lg">{fmt(Number(devolucao.valor_total_devolvido || 0))}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5 uppercase font-medium text-[10px]">
                        <ArrowRight className="w-3 h-3" /> Abatimento de Parcelas
                      </span>
                      <span className="font-bold">-{fmt(Number(devolucao.valor_abatido_parcelas || 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600 font-bold bg-green-500/5 p-2 rounded-md">
                      <span className="flex items-center gap-1.5 uppercase font-medium text-[10px]">
                        <CreditCard className="w-3 h-3" /> Crédito p/ Cliente Gerado
                      </span>
                      <span>+{fmt(Number(devolucao.valor_credito_gerado || 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivo/Obs */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Motivo da Devolução</p>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm">
                  <p className="font-medium text-amber-800">{devolucao.motivo || "Não informado"}</p>
                  {devolucao.observacoes && (
                    <p className="mt-2 text-xs text-muted-foreground italic border-t pt-2 border-amber-500/10">
                      Obs: {devolucao.observacoes}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Audit */}
              <div className="pt-4 flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold tracking-widest">
                <span>Registrado por: {devolucao.created_by?.slice(0, 8) || "SISTEMA"}</span>
                <Badge variant="outline" className="text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20">
                  Operação Atômica Confirmada
                </Badge>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
