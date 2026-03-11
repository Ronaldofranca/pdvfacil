import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsertCategoria } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria?: any;
}

export function CategoriaForm({ open, onOpenChange, categoria }: Props) {
  const { profile } = useAuth();
  const upsert = useUpsertCategoria();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    setNome(categoria?.nome ?? "");
    setDescricao(categoria?.descricao ?? "");
  }, [categoria, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    upsert.mutate(
      { id: categoria?.id, nome, descricao, empresa_id: profile.empresa_id },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
