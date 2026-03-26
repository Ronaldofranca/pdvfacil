import * as React from "react";
import { useCatalogoBanners, useSaveCatalogoBanner, useDeleteCatalogoBanner } from "@/hooks/useCatalogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Save } from "lucide-react";
import { ImageUpload } from "@/components/produtos/ImageUpload";
import { toast } from "sonner";

interface Banner {
  id?: string;
  imagem_url: string;
  titulo?: string;
  subtitulo?: string;
  link?: string;
  ordem?: number;
  ativo?: boolean;
}

export function CatalogBannerManager() {
  const { data: banners, isLoading } = useCatalogoBanners();
  const save = useSaveCatalogoBanner();
  const remove = useDeleteCatalogoBanner();

  const [editing, setEditing] = React.useState<Banner | null>(null);

  const handleAdd = () => {
    setEditing({ imagem_url: "", titulo: "", subtitulo: "", link: "", ordem: (banners?.length || 0), ativo: true });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.imagem_url) {
      toast.error("A URL da imagem é obrigatória");
      return;
    }
    await save.mutateAsync(editing);
    setEditing(null);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!banners) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const currentBanner = { ...banners[index], ordem: targetIndex };
    const targetBanner = { ...banners[targetIndex], ordem: index };

    await Promise.all([
      save.mutateAsync(currentBanner),
      save.mutateAsync(targetBanner)
    ]);
  };

  if (isLoading) return <div>Carregando banners...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Slider de Banners</h3>
        <Button variant="outline" size="sm" onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar Banner
        </Button>
      </div>

      <div className="space-y-3">
        {banners?.map((banner, index) => (
          <Card key={banner.id} className="p-3">
            <div className="flex items-center gap-4">
              <div className="w-20 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                <img src={banner.imagem_url} alt={banner.titulo} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{banner.titulo || "Sem título"}</p>
                <p className="text-xs text-muted-foreground truncate">{banner.subtitulo || "Sem subtítulo"}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(index, "up")} disabled={index === 0}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(index, "down")} disabled={index === (banners?.length - 1)}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(banner)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(banner.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <Card className="p-4 space-y-4 border-primary">
          <h4 className="text-sm font-bold">{editing.id ? "Editar Banner" : "Novo Banner"}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={editing.titulo} onChange={(e) => setEditing({ ...editing, titulo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input value={editing.subtitulo} onChange={(e) => setEditing({ ...editing, subtitulo: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Imagem do Banner</Label>
            <ImageUpload 
              currentImageUrl={editing.imagem_url}
              onImageUploaded={(url) => {
                const finalUrl = typeof url === 'string' ? url : url.large;
                setEditing({ ...editing, imagem_url: finalUrl });
              }}
              onImageRemoved={() => setEditing({ ...editing, imagem_url: "" })}
              recommendedSize="1920 x 700 px"
              aspectRatio={1920/700}
              storagePath="banners"
            />
          </div>
          <div className="space-y-2">
            <Label>Link do Botão/Área</Label>
            <Input value={editing.link} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="/catalogo/produtos/..." />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={editing.ativo} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              <Label>Visível no banner</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={save.isPending}>
                <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
