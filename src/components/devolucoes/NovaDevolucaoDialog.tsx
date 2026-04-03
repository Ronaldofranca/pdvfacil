import { useState, useMemo, useEffect } from "react";
import { Package, Search, Calendar, ChevronRight, User, Package2, RefreshCw, ArrowRight, CreditCard, AlertTriangle, Trash2, ShoppingCart, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVendas, useVendaItens, useVendaParcelas } from "@/hooks/useVendas";
import { useRegistrarDevolucao, useItensDevolvidosTotal } from "@/hooks/useDevolucoes";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { fmtR } from "@/lib/reportExport";
import { ReciboCredito } from "./ReciboCredito";

interface NovaDevolucaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVendaId?: string | null;
}

export function NovaDevolucaoDialog({ open, onOpenChange, initialVendaId }: NovaDevolucaoDialogProps) {
  const { profile } = useAuth();
  const { data: vendas } = useVendas();
  const registrar = useRegistrarDevolucao();

  const [step, setStep] = useState<1 | 2>(initialVendaId ? 2 : 1);
  const [searchVenda, setSearchVenda] = useState("");
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [reciboCreditoOpen, setReciboCreditoOpen] = useState(false);

  useEffect(() => {
    if (open && initialVendaId) {
      setSelectedVendaId(initialVendaId);
      setStep(2);
    } else if (open && !initialVendaId && !selectedVendaId) {
      setStep(1);
    }
  }, [open, initialVendaId]);
  
  const { data: itensVenda, isLoading: loadingItens } = useVendaItens(selectedVendaId);
  const { data: parcelasVenda } = useVendaParcelas(selectedVendaId);
  const { data: itensDevolvidosTotal } = useItensDevolvidosTotal(selectedVendaId);
  
  const [tipoImpacto, setTipoImpacto] = useState<'auto' | 'total_credito' | 'estoque_apenas'>('auto');
  const [quantidadesDevolvidas, setQuantidadesDevolvidas] = useState<Record<string, number>>({});
  const [precosDevolvidos, setPrecosDevolvidos] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");

  const selectedVenda = useMemo(() => 
    vendas?.find(v => v.id === selectedVendaId), 
    [vendas, selectedVendaId]
  );

  const filteredVendas = useMemo(() => {
    if (!searchVenda) return [];
    return vendas?.filter(v => 
      v.id.toLowerCase().includes(searchVenda.toLowerCase()) || 
      (v as any).clientes?.nome?.toLowerCase().includes(searchVenda.toLowerCase())
    ).slice(0, 5);
  }, [vendas, searchVenda]);

  const totalDevolucao = useMemo(() => {
    return Object.entries(quantidadesDevolvidas).reduce((sum, [itemId, qty]) => {
      const item = itensVenda?.find(i => i.id === itemId);
      const preco = precosDevolvidos[itemId] ?? Number(item?.preco_vendido || 0);
      return sum + (qty * preco);
    }, 0);
  }, [quantidadesDevolvidas, itensVenda, precosDevolvidos]);

  const valorAberto = useMemo(() => {
    if (!parcelasVenda) return 0;
    return parcelasVenda
      .filter(p => ["pendente", "parcial", "vencida"].includes(p.status))
      .reduce((sum, p) => sum + (Number(p.valor_total) - Number(p.valor_pago)), 0);
  }, [parcelasVenda]);

  const impactoFinanceiro = useMemo(() => {
    if (tipoImpacto === 'estoque_apenas') return { abatimento: 0, credito: 0 };
    if (tipoImpacto === 'total_credito') return { abatimento: 0, credito: totalDevolucao };
    
    // Caso 'auto'
    const abatimento = Math.min(totalDevolucao, valorAberto);
    const credito = Math.max(0, totalDevolucao - valorAberto);
    return { abatimento, credito };
  }, [tipoImpacto, totalDevolucao, valorAberto]);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleSelectVenda = (id: string) => {
    setSelectedVendaId(id);
    setStep(2);
    setQuantidadesDevolvidas({});
    setPrecosDevolvidos({});
  };

  const handleQtyChange = (itemId: string, max: number, val: number) => {
    const qty = Math.max(0, Math.min(max, val));
    setQuantidadesDevolvidas(prev => ({
      ...prev,
      [itemId]: qty
    }));
  };

  const handleConfirm = async () => {
    if (!selectedVenda || !profile?.empresa_id) return;
    
    const { data: devolucoes, error: devError } = await supabase
      .from("devolucoes")
      .select("id")
      .eq("venda_id", selectedVenda.id);
    
    if (devError) throw devError;
    const devIds = devolucoes?.map(d => d.id) || [];

    const { data: itens, error: itemError } = await supabase
      .from("itens_devolucao")
      .select("item_venda_id, produto_id, quantidade")
      .in("devolucao_id", devIds);
    
    if (itemError) throw itemError;

    const totais = { porItem: {} as Record<string, number>, porProduto: {} as Record<string, number> };
    itens?.forEach(item => {
      if (item.item_venda_id) {
        totais.porItem[item.item_venda_id] = (totais.porItem[item.item_venda_id] || 0) + Number(item.quantidade);
      }
      if (item.produto_id) {
        totais.porProduto[item.produto_id] = (totais.porProduto[item.produto_id] || 0) + Number(item.quantidade);
      }
    });

    const itensParaDevolver = Object.entries(quantidadesDevolvidas)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = itensVenda?.find(i => i.id === itemId);
        const jaDevolvido = Number(totais.porItem?.[itemId] || totais.porProduto?.[item?.produto_id || ""] || 0);
        const max = Number(item?.quantidade || 0) - jaDevolvido;
        
        if (qty > max) {
          throw new Error(`Quantidade excedente para ${item?.nome_produto || itemId}. Disponível: ${max}`);
        }

        return {
          item_venda_id: itemId,
          produto_id: item!.produto_id,
          quantidade: qty,
          valor_unitario: precosDevolvidos[itemId] ?? Number(item!.preco_vendido)
        };
      });

    if (itensParaDevolver.length === 0) {
      toast.error("Selecione pelo menos um item para devolver.");
      return;
    }

    if (!motivo.trim()) {
      toast.error("Informe o motivo da devolução.");
      return;
    }

    try {
      const result = await registrar.mutateAsync({
        venda_id: selectedVenda.id,
        cliente_id: selectedVenda.cliente_id,
        empresa_id: profile.empresa_id,
        motivo,
        observacoes: obs,
        tipo_impacto: tipoImpacto,
        itens: itensParaDevolver
      });
      setSuccessResult(result);
    } catch (error) {
      toast.error("Erro inesperado ao processar devolução");
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedVendaId(null);
    setSearchVenda("");
    setQuantidadesDevolvidas({});
    setMotivo("");
    setObs("");
    setSuccessResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Registrar Devolução
          </DialogTitle>
          <DialogDescription>
            Devolução formal de itens com ajuste automático de estoque e financeiro.
          </DialogDescription>
        </DialogHeader>

        {registrar.isSuccess ? (
          <div className="space-y-4 py-8 text-center px-6">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Devolução Concluída!</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Os itens retornaram ao estoque e o financeiro foi atualizado.
            </p>
            
            {successResult?.valor_credito_gerado > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/20 max-w-xs mx-auto">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Crédito Gerado</p>
                <p className="text-2xl font-bold text-primary">{fmtR(successResult.valor_credito_gerado)}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3 gap-2"
                  onClick={() => setReciboCreditoOpen(true)}
                >
                  <Printer className="w-4 h-4" /> Recibo de Crédito
                </Button>
              </Card>
            )}

            <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            
            <ReciboCredito 
              open={reciboCreditoOpen}
              onOpenChange={setReciboCreditoOpen}
              devolucao={{ id: successResult?.devolucao_id }}
              cliente={(selectedVenda as any)?.clientes}
              valorCredito={successResult?.valor_credito_gerado ?? 0}
            />
          </div>
        ) : step === 1 ? (
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Buscar Venda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="ID da venda ou nome do cliente..."
                  className="pl-9"
                  value={searchVenda}
                  onChange={(e) => setSearchVenda(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredVendas.length > 0 ? (
                <div className="rounded-md border divide-y">
                  {filteredVendas.map(v => (
                    <button
                      key={v.id}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => handleSelectVenda(v.id)}
                    >
                      <div>
                        <p className="font-semibold text-sm">{(v as any).clientes?.nome ?? "Venda sem cliente"}</p>
                        <p className="text-xs text-muted-foreground font-mono">#{v.id.slice(0, 8)} • {format(new Date(v.data_venda), "dd/MM/yy HH:mm")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{fmt(Number(v.total))}</p>
                        <Badge variant={v.status === 'finalizada' ? 'default' : 'outline'} className="text-[10px] h-4">
                          {v.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchVenda.length > 2 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhuma venda encontrada.</p>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <ShoppingCart className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Digite acima para localizar a venda original.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 pb-6">
                <Card className="p-3 bg-muted/30 border-dashed">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
                      <p className="text-sm font-bold">{(selectedVenda as any)?.clientes?.nome ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Venda</p>
                      <p className="text-sm font-mono">#{selectedVenda?.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Total Original: <span className="font-medium">{fmt(Number(selectedVenda?.total || 0))}</span></span>
                    <span className="text-destructive font-medium">Saldo em Aberto: {fmt(valorAberto)}</span>
                  </div>
                </Card>

                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Package className="w-4 h-4" /> Itens Disponíveis para Devolução
                  </Label>
                  <div className="space-y-2">
                    {loadingItens || !itensDevolvidosTotal ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                         <RefreshCw className="w-6 h-6 animate-spin opacity-20" />
                         <p className="text-xs italic">Sincronizando disponibilidade de itens...</p>
                      </div>
                    ) : itensVenda?.map((item) => {
                      const jaDevolvido = Number(
                        itensDevolvidosTotal?.porItem?.[item.id] || 
                        itensDevolvidosTotal?.porProduto?.[item.produto_id] || 
                        0
                      );
                      const maxDisponivel = Math.max(0, Number(item.quantidade) - jaDevolvido);
                      const selecionado = quantidadesDevolvidas[item.id] || 0;
                      const precoAtual = precosDevolvidos[item.id] ?? Number(item.preco_vendido);

                      return (
                        <div key={item.id} className="flex flex-col p-3 rounded-lg border bg-card gap-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{item.nome_produto}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-muted-foreground uppercase font-medium">
                                <span>Vendidos: <b className="text-foreground">{Number(item.quantidade)}</b></span>
                                <span className={jaDevolvido > 0 ? "text-amber-600 font-bold" : ""}>
                                  Devolvidos: <b>{jaDevolvido}</b>
                                </span>
                                <span className="text-primary font-bold">Disponível: {maxDisponivel}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <Label className="text-[9px] uppercase text-muted-foreground">Qtde. Devolver</Label>
                              <div className="flex items-center border rounded-md h-8 bg-background">
                                <button 
                                  className="px-2 h-full hover:bg-muted transition-colors disabled:opacity-30"
                                  disabled={selecionado <= 0}
                                  onClick={() => handleQtyChange(item.id, maxDisponivel, selecionado - 1)}
                                >
                                  -
                                </button>
                                <input 
                                  type="number"
                                  className="w-10 text-center text-sm bg-transparent border-none focus:ring-0 font-bold"
                                  value={selecionado}
                                  onChange={(e) => handleQtyChange(item.id, maxDisponivel, parseInt(e.target.value) || 0)}
                                />
                                <button 
                                  className="px-2 h-full hover:bg-muted transition-colors disabled:opacity-30"
                                  disabled={selecionado >= maxDisponivel}
                                  onClick={() => handleQtyChange(item.id, maxDisponivel, selecionado + 1)}
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-[9px] font-medium">Máx: {maxDisponivel}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-dashed">
                             <div className="space-y-1">
                               <Label className="text-[10px] text-muted-foreground uppercase font-bold">Preço de Venda (Ref)</Label>
                               <p className="text-xs font-mono">{fmt(Number(item.preco_vendido))}</p>
                             </div>
                             <div className="space-y-1 flex flex-col items-end">
                               <Label className="text-[10px] text-muted-foreground uppercase font-bold">Preço de Devolução</Label>
                               <div className="relative">
                                 <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground italic">R$</span>
                                 <input 
                                   type="number"
                                   step="0.01"
                                   className="w-24 h-7 pl-6 pr-2 text-right text-xs rounded border bg-background font-bold focus:ring-1 focus:ring-primary outline-none"
                                   value={precoAtual}
                                   onChange={(e) => setPrecosDevolvidos(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                                 />
                               </div>
                             </div>
                             <div className="space-y-1 text-right">
                               <Label className="text-[10px] text-muted-foreground uppercase font-bold">Subtotal</Label>
                               <p className="text-xs font-bold text-primary">{fmt(selecionado * precoAtual)}</p>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo da Devolução *</Label>
                    <Input id="motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Produto com defeito" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="obs">Observações Adicionais</Label>
                    <Input id="obs" value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider">Como deseja tratar o valor da devolução?</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setTipoImpacto('auto')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all gap-2 ${tipoImpacto === 'auto' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-card hover:border-primary/50'}`}
                    >
                      <RefreshCw className="w-5 h-5" />
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase">Automático</p>
                        <p className="text-[9px] opacity-70 leading-tight">Abater dívidas e gerar crédito</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoImpacto('total_credito')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all gap-2 ${tipoImpacto === 'total_credito' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-card hover:border-primary/50'}`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase">Gerar Crédito</p>
                        <p className="text-[9px] opacity-70 leading-tight">Ignorar dívida e dar crédito total</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoImpacto('estoque_apenas')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all gap-2 ${tipoImpacto === 'estoque_apenas' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-card hover:border-primary/50'}`}
                    >
                      <Package2 className="w-5 h-5" />
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase">Apenas Estoque</p>
                        <p className="text-[9px] opacity-70 leading-tight">Não altera financeiro do cliente</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Impact Preview */}
                {totalDevolucao > 0 && tipoImpacto !== 'estoque_apenas' && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex justify-between items-center text-primary font-bold">
                      <span className="text-sm">TOTAL A REEMBOLSAR/ABATER</span>
                      <span className="text-lg">{fmt(totalDevolucao)}</span>
                    </div>
                    <Separator className="bg-primary/10" />
                    <div className="space-y-2 text-xs">
                      {impactoFinanceiro.abatimento > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <ArrowRight className="w-3 h-3" /> Abatimento de Dívida (Saldo Aberto)
                          </span>
                          <span className="font-bold text-foreground">-{fmt(impactoFinanceiro.abatimento)}</span>
                        </div>
                      )}
                      
                      {impactoFinanceiro.credito > 0 && (
                        <div className="flex justify-between items-center text-green-600 font-bold bg-green-500/5 p-2 rounded-md">
                          <span className="flex items-center gap-1.5 font-medium uppercase text-[10px]">
                            <CreditCard className="w-3 h-3" /> Crédito p/ Cliente Gerado
                          </span>
                          <span>+{fmt(impactoFinanceiro.credito)}</span>
                        </div>
                      )}

                      {tipoImpacto === 'auto' && impactoFinanceiro.abatimento > 0 && (
                        <p className="text-[10px] text-muted-foreground pl-4.5 italic">
                          O valor será deduzido prioritariamente das parcelas vencidas ou a vencer.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 pt-1 border-t border-dashed mt-4">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 leading-tight font-medium uppercase tracking-tight">
                    Atenção: Esta operação é definitiva. Os itens retornarão ao estoque e o financeiro será ajustado automaticamente conforme sua escolha.
                  </p>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button 
                disabled={totalDevolucao <= 0 || !motivo.trim() || registrar.isPending}
                onClick={handleConfirm}
                className="gap-2"
              >
                {registrar.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Confirmar Devolução
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
