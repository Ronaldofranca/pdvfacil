import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddMovimento, useVendedores, type MovimentoInput } from "@/hooks/useEstoque";
import { useProdutos } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

const TIPOS = [
  { value: "reposicao", label: "Reposição", color: "text-green-600" },
  { value: "venda", label: "Venda", color: "text-blue-600" },
  { value: "dano", label: "Dano", color: "text-destructive" },
  { value: "ajuste", label: "Ajuste", color: "text-orange-600" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovimentoForm({ open, onOpenChange }: Props) {
  const { profile, user } = useAuth();
  const { isAdmin, isGerente } = usePermissions();
  const { data: produtos } = useProdutos();
  const { data: vendedores } = useVendedores();
  const addMov = useAddMovimento();

  const canSelectVendedor = isAdmin || isGerente;

  const [form, setForm] = useState({
    produto_id: "",
    vendedor_id: user?.id ?? "",
    tipo: "" as string,
    quantidade: "",
    observacoes: "",
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    const payload: MovimentoInput = {
      empresa_id: profile.empresa_id,
      produto_id: form.produto_id,
      vendedor_id: canSelectVendedor ? form.vendedor_id : user.id,
      tipo: form.tipo as MovimentoInput["tipo"],
      quantidade: parseFloat(form.quantidade) || 0,
      observacoes: form.observacoes,
    };
    addMov.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ produto_id: "", vendedor_id: user?.id ?? "", tipo: "", quantidade: "", observacoes: "" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Movimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Produto *</Label>
            <Select value={form.produto_id} onValueChange={(v) => set("produto_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
              <SelectContent>
                {produtos?.filter((p) => p.ativo).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}{p.codigo ? ` (${p.codigo})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canSelectVendedor && (
            <div>
              <Label>Vendedor *</Label>
              <Select value={form.vendedor_id} onValueChange={(v) => set("vendedor_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o vendedor..." /></SelectTrigger>
                <SelectContent>
                  {vendedores?.map((v) => (
                    <SelectItem key={v.user_id} value={v.user_id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Tipo de Movimento *</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className={t.color}>{t.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Quantidade *</Label>
            <Input required type="number" min="0.01" step="0.01" value={form.quantidade} onChange={(e) => set("quantidade", e.target.value)} />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={addMov.isPending || !form.produto_id || !form.tipo}>
              {addMov.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
