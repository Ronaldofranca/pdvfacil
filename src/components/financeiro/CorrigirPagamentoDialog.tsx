import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Info, ArrowRight } from "lucide-react";
import { useCorrigirPagamento } from "@/hooks/useParcelas";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: any; // o objeto de pagamento selecionado
  parcela: any;   // o objeto de parcela ao qual pertence
}

export function CorrigirPagamentoDialog({ open, onOpenChange, pagamento, parcela }: Props) {
  const { user, profile } = useAuth();
  const corrigir = useCorrigirPagamento();

  const [novoValor, setNovoValor] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [novaData, setNovaData] = useState("");

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  useEffect(() => {
    if (open && pagamento) {
      setNovoValor(String(pagamento.valor_pago || 0));
      setMotivo("");
      // Inicializa com a data_pagamento atual do registro
      const dp = pagamento.data_pagamento ? new Date(pagamento.data_pagamento) : new Date();
      setNovaData(format(dp, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [open, pagamento]);

  if (!pagamento || !parcela) return null;

  const originalValor = Number(pagamento.valor_pago);
  const inputValor = parseFloat(novoValor) || 0;
  const diff = inputValor - originalValor;

  const totalParcela = Number(parcela.valor_total);
  const atualValorPagoTotal = Number(parcela.valor_pago);
  
  const novoValorPagoTotal = atualValorPagoTotal + diff;
  const novoSaldo = totalParcela - novoValorPagoTotal;

  // Calculo de status dinamico para preview
  let novoStatus = parcela.status;
  if (novoSaldo <= 0) novoStatus = "paga";
  else if (novoValorPagoTotal > 0) novoStatus = "parcial";
  else {
    const isVencida = new Date(parcela.vencimento) < new Date();
    novoStatus = isVencida ? "vencida" : "pendente";
  }

  const isInvalid = inputValor < 0 || novoSaldo < 0 || !motivo.trim() || !novaData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid || !user) return;

    corrigir.mutate({
      pagamento_id: pagamento.id,
      novo_valor: inputValor,
      nova_data_pagamento: new Date(novaData).toISOString(),
      motivo: motivo.trim(),
      usuario_id: user.id,
      usuario_nome: profile?.nome || "Usuário",
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Corrigir Recebimento
          </DialogTitle>
          <DialogDescription>
            Essa ação recalculará a parcela e registrará na auditoria permanentemente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Valor Lançado Originalmente:</span>
              <span className="font-semibold text-foreground line-through opacity-70">
                {fmt(originalValor)}
              </span>
            </div>
            
            <div className="pt-2">
              <Label className="text-primary font-bold">Novo Valor Recebido (R$):</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={novoValor} 
                onChange={(e) => setNovoValor(e.target.value)} 
                className="mt-1 font-bold text-lg"
                autoFocus
                required
              />
            </div>
            <div className="pt-2">
              <Label className="text-primary font-bold">Data do Pagamento:</Label>
              <Input
                type="datetime-local"
                value={novaData}
                max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setNovaData(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-center p-3 border rounded-md">
            <div>
              <p className="text-xs text-muted-foreground">Saldo Atual</p>
              <p className="font-semibold">{fmt(Number(parcela.saldo))}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">{parcela.status}</Badge>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground/50" />
            <div>
              <p className="text-xs text-muted-foreground">Novo Saldo (Prévia)</p>
              <p className={`font-semibold ${novoSaldo < 0 ? "text-destructive" : "text-primary"}`}>
                {fmt(novoSaldo)}
              </p>
              <Badge 
                variant={novoStatus === "paga" ? "default" : novoStatus === "vencida" ? "destructive" : "outline"} 
                className="mt-1 text-[10px]"
              >
                {novoStatus}
              </Badge>
            </div>
          </div>

          {novoSaldo < 0 && (
            <div className="flex gap-2 items-center p-2 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>O saldo não pode ficar negativo (valor recebido excede o total da parcela).</p>
            </div>
          )}

          <div>
            <Label>Motivo da Correção *</Label>
            <Textarea 
              value={motivo} 
              onChange={(e) => setMotivo(e.target.value)} 
              placeholder="Descreva o porquê está alterando este valor..."
              className="resize-none"
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={isInvalid || corrigir.isPending}>
              {corrigir.isPending ? "Processando..." : "Confirmar Correção Auditable"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
