import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useProdutos, useUpsertKit, type KitInput } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";

interface KitItem {
  produto_id: string;
  quantidade: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kit?: any;
}

export function KitForm({ open, onOpenChange, kit }: Props) {
  const { profile } = useAuth();
  const { data: produtos } = useProdutos();
  const upsert = useUpsertKit();

  const [form, setForm] = useState({ nome: "", descricao: "", preco: "", ativo: true });
  const [itens, setItens] = useState<KitItem[]>([]);

  useEffect(() => {
    if (kit) {
      setForm({
        nome: kit.nome,
        descricao: kit.descricao ?? "",
        preco: String(kit.preco ?? 0),
        ativo: kit.ativo ?? true,
      });
      setItens(kit.kit_itens?.map((i: any) => ({ produto_id: i.produto_id, quantidade: Number(i.quantidade) })) ?? []);
    } else {
      setForm({ nome: "", descricao: "", preco: "", ativo: true });
      setItens([]);
    }
  }, [kit, open]);

  const addItem = () => setItens([...itens, { produto_id: "", quantidade: 1 }]);
  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof KitItem, value: string | number) => {
    const next = [...itens];
    (next[idx] as any)[field] = value;
    setItens(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const payload: KitInput = {
      id: kit?.id,
      empresa_id: profile.empresa_id,
      nome: form.nome,
      descricao: form.descricao,
      preco: parseFloat(form.preco) || 0,
      ativo: form.ativo,
      itens: itens.filter((i) => i.produto_id),
    };
    upsert.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kit ? "Editar Kit" : "Novo Kit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Preço do Kit (R$)</Label>
            <Input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            <Label>Ativo</Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Itens do Kit</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            {itens.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={item.produto_id} onValueChange={(v) => updateItem(idx, "produto_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Produto..." /></SelectTrigger>
                    <SelectContent>
                      {produtos?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <Input type="number" min={1} step="0.01" value={item.quantidade} onChange={(e) => updateItem(idx, "quantidade", parseFloat(e.target.value) || 1)} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {itens.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
