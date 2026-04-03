import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useRegistrarPagamento, usePagamentosDaParcela, type PagamentoInput } from "@/hooks/useParcelas";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CorrigirPagamentoDialog } from "./CorrigirPagamentoDialog";

const FORMAS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: any;
}

export function PagamentoForm({ open, onOpenChange, parcela }: Props) {
  const { profile, user } = useAuth();
  const { isAdmin } = usePermissions();
  const registrar = useRegistrarPagamento();
  const { data: historico } = usePagamentosDaParcela(parcela?.id ?? null);
  
  const [pagamentoCorrigir, setPagamentoCorrigir] = useState<any>(null);

  const saldo = Number(parcela?.saldo ?? 0);
  const [valor, setValor] = useState(String(saldo));
  const [forma, setForma] = useState("pix");
  const [obs, setObs] = useState("");

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Reset on open
  useState(() => {
    setValor(String(saldo));
    setForma("pix");
    setObs("");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || !parcela) return;
    const input: PagamentoInput = {
      empresa_id: profile.empresa_id,
      parcela_id: parcela.id,
      valor_pago: parseFloat(valor) || 0,
      forma_pagamento: forma,
      usuario_id: user.id,
      observacoes: obs,
    };
    registrar.mutate(input, {
      onSuccess: () => {
        onOpenChange(false);
        setValor("");
        setObs("");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        {parcela && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold">{fmt(Number(parcela.valor_total))}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">Pago</p>
              <p className="text-sm font-bold text-primary">{fmt(Number(parcela.valor_pago))}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className="text-sm font-bold text-destructive">{fmt(saldo)}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor (R$) *</Label>
              <Input required type="number" step="0.01" min="0.01" max={saldo} value={valor} onChange={(e) => setValor(e.target.value)} onBlur={(e) => { const v = parseFloat(e.target.value); setValor(isNaN(v) ? "0.00" : v.toFixed(2)); }} />
            </div>
            <div>
              <Label>Forma *</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={registrar.isPending || saldo <= 0}>
              {registrar.isPending ? "Salvando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </form>

        {/* Histórico de pagamentos */}
        {historico && historico.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pagamentos anteriores</p>
              {historico.map((pg) => (
                <div key={pg.id} className="flex flex-col gap-1 p-2 rounded border text-sm relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {fmt(Number(pg.valor_pago))}
                        {pg.observacoes && pg.observacoes.includes("== CORREÇÃO ==") && (
                          <Badge variant="secondary" className="text-[10px] ml-1 bg-yellow-500/15 text-yellow-600 border-none px-1 h-4">Ajustado</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pg.data_pagamento), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {pg.forma_pagamento.replace("_", " ")}
                      </Badge>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => setPagamentoCorrigir(pg)}
                          title="Corrigir este valor (Auditorado)"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {pg.observacoes && (
                    <div className="mt-1 pt-1 border-t text-[11px] text-muted-foreground whitespace-pre-wrap">
                      {pg.observacoes}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <CorrigirPagamentoDialog 
              open={!!pagamentoCorrigir} 
              onOpenChange={(v) => !v && setPagamentoCorrigir(null)}
              pagamento={pagamentoCorrigir}
              parcela={parcela}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
