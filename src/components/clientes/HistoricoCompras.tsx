import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, ShoppingBag } from "lucide-react";
import { useHistoricoCompras, useAddHistorico } from "@/hooks/useClientes";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: any;
}

export function HistoricoCompras({ open, onOpenChange, cliente }: Props) {
  const { profile, user } = useAuth();
  const { data: historico, isLoading } = useHistoricoCompras(cliente?.id ?? null);
  const addHistorico = useAddHistorico();

  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || !cliente) return;
    addHistorico.mutate(
      {
        empresa_id: profile.empresa_id,
        cliente_id: cliente.id,
        usuario_id: user.id,
        descricao: desc,
        valor: parseFloat(valor) || 0,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setDesc("");
          setValor("");
        },
      }
    );
  };

  const totalCompras = historico?.reduce((sum, h) => sum + Number(h.valor), 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Histórico — {cliente?.nome}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Resumo */}
          <div className="flex gap-4">
            <div className="flex-1 rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Total compras</p>
              <p className="text-lg font-bold text-foreground">{historico?.length ?? 0}</p>
            </div>
            <div className="flex-1 rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-lg font-bold text-primary">{fmt(totalCompras)}</p>
            </div>
          </div>

          {/* Add form */}
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3.5 h-3.5" /> Registrar compra
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="space-y-3 p-3 rounded-lg border bg-card">
              <div>
                <Label>Descrição *</Label>
                <Input required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Compra de kit liso supremo" />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={(e) => { const v = parseFloat(e.target.value); setValor(isNaN(v) ? "0.00" : v.toFixed(2)); }} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={addHistorico.isPending}>Salvar</Button>
              </div>
            </form>
          )}

          <Separator />

          {/* Lista */}
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : !historico?.length ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma compra registrada</p>
          ) : (
            <div className="space-y-3">
              {historico.map((h) => (
                <div key={h.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-foreground">{h.descricao || "Compra"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.data_compra), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {h.observacoes && <p className="text-xs text-muted-foreground">{h.observacoes}</p>}
                  </div>
                  <Badge variant="secondary" className="font-semibold">{fmt(Number(h.valor))}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
