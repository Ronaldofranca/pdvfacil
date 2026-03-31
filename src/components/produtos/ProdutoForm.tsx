import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCategorias, useUpsertProduto, type ProdutoInput } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUpload } from "./ImageUpload";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: any;
}

export function ProdutoForm({ open, onOpenChange, produto }: Props) {
  const { profile } = useAuth();
  const { data: categorias } = useCategorias();
  const upsert = useUpsertProduto();
  const isEditing = !!produto;
  const draftKey = isEditing ? `produto_edit_${produto.id}` : "produto_new";

  const defaultForm = {
    nome: "",
    descricao: "",
    codigo: "",
    categoria_id: "",
    preco: "",
    custo: "",
    unidade: "un",
    ativo: true,
    imagem_url: "" as string | null,
  };

  const { data: form, setData: setForm, clear: clearDraft, hasDraft } = useFormPersistence(
    draftKey,
    defaultForm,
    open && !isEditing
  );

  useNavigationGuard(open && form.nome !== "" && !isEditing);

  useEffect(() => {
    if (produto) {
      setForm({
        nome: produto.nome,
        descricao: produto.descricao ?? "",
        codigo: produto.codigo ?? "",
        categoria_id: produto.categoria_id ?? "",
        preco: String(produto.preco ?? 0),
        custo: String(produto.custo ?? 0),
        unidade: produto.unidade ?? "un",
        ativo: produto.ativo ?? true,
        imagem_url: produto.imagem_url ?? null,
      });
    } else if (!hasDraft) {
      setForm(defaultForm);
    }
  }, [produto, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const payload: ProdutoInput = {
      id: produto?.id,
      empresa_id: profile.empresa_id,
      nome: form.nome,
      descricao: form.descricao,
      codigo: form.codigo,
      categoria_id: form.categoria_id || null,
      preco: parseFloat(form.preco) || 0,
      custo: parseFloat(form.custo) || 0,
      unidade: form.unidade,
      ativo: form.ativo,
      imagem_url: form.imagem_url,
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        clearDraft();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <div>
            <Label>Imagem do produto</Label>
            <div className="mt-1.5">
              <ImageUpload
                currentImageUrl={form.imagem_url}
                onImageUploaded={(urls) => {
                  // Store medium as main URL (good balance)
                  setForm({ ...form, imagem_url: typeof urls === 'string' ? urls : urls.medium });
                }}
                onImageRemoved={() => setForm({ ...form, imagem_url: null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div>
              <Label>Unidade</Label>
              <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} onBlur={(e) => { const v = parseFloat(e.target.value); setForm((f: typeof form) => ({ ...f, preco: isNaN(v) ? "0.00" : v.toFixed(2) })); }} />
            </div>
            <div>
              <Label>Custo (R$)</Label>
              <Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} onBlur={(e) => { const v = parseFloat(e.target.value); setForm((f: typeof form) => ({ ...f, custo: isNaN(v) ? "0.00" : v.toFixed(2) })); }} />
            </div>
            <div className="col-span-2">
              <Label>Categoria</Label>
              <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categorias?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
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
