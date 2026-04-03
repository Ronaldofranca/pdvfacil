import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsertCategoria, useDeleteCategoria } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUpload } from "./ImageUpload";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria?: any;
}

export function CategoriaForm({ open, onOpenChange, categoria }: Props) {
  const { profile } = useAuth();
  const upsert = useUpsertCategoria();
  const deletar = useDeleteCategoria();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);

  useEffect(() => {
    setNome(categoria?.nome ?? "");
    setDescricao(categoria?.descricao ?? "");
    setImagemUrl(categoria?.imagem_url ?? null);
  }, [categoria, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    upsert.mutate(
      { id: categoria?.id, nome, descricao, empresa_id: profile.empresa_id } as any,
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleDelete = () => {
    if (!categoria?.id) return;
    deletar.mutate(categoria.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Miniatura da Categoria</Label>
            <div className="mt-1.5">
              <ImageUpload 
                currentImageUrl={imagemUrl}
                onImageUploaded={(url) => {
                  const finalUrl = typeof url === 'string' ? url : url.medium;
                  setImagemUrl(finalUrl);
                }}
                onImageRemoved={() => setImagemUrl(null)}
                recommendedSize="600 x 600 px"
                aspectRatio={1}
                storagePath="categorias"
              />
            </div>
          </div>
          <div>
            <Label>Nome *</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Botão Excluir — só aparece quando está editando */}
            {categoria?.id ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    disabled={deletar.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir categoria "{nome}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Os produtos vinculados a essa categoria perderão o vínculo, mas não serão excluídos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Sim, excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
