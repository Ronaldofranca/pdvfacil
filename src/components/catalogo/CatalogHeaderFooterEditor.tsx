import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/produtos/ImageUpload";
import { Instagram, Facebook, Twitter, Phone, MapPin, Link2 } from "lucide-react";

export interface CatalogHeaderFooter {
  logo_url?: string;
  brand_name?: string;
  background_color?: string;
  text_color?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  address?: string;
  useful_links?: { label: string; url: string }[];
  footer_message?: string;
}

interface CatalogHeaderFooterEditorProps {
  config: CatalogHeaderFooter;
  onConfigChange: (config: CatalogHeaderFooter) => void;
}

export function CatalogHeaderFooterEditor({ config, onConfigChange }: CatalogHeaderFooterEditorProps) {
  const updateField = (field: keyof CatalogHeaderFooter, value: any) => {
    onConfigChange({ ...config, [field]: value });
  };

  const updateSocial = (social: keyof CatalogHeaderFooter["socials"], value: string) => {
    onConfigChange({
      ...config,
      socials: { ...config.socials, [social]: value }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Configuração do Cabeçalho</h3>
        <div className="space-y-4 pt-2">
          <Label>Logo do Catálogo</Label>
          <ImageUpload
            currentImageUrl={config.logo_url}
            onImageUploaded={(url) => {
              const finalUrl = typeof url === 'string' ? url : url.medium;
              onConfigChange({ ...config, logo_url: finalUrl });
            }}
            onImageRemoved={() => onConfigChange({ ...config, logo_url: "" })}
            recommendedSize="400 x 120 px"
            aspectRatio={400/120}
            storagePath="logos"
          />
          <p className="text-[10px] text-muted-foreground italic">
            Dica: Use um logo com fundo transparente (PNG) para melhor adaptação ao tema.
          </p>
        </div>
        <div>
          <Label>Nome da Marca</Label>
          <Input value={config.brand_name} onChange={(e) => updateField("brand_name", e.target.value)} />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Configuração do Rodapé</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Instagram className="w-4 h-4" /> Instagram</Label>
            <Input value={config.socials?.instagram} onChange={(e) => updateSocial("instagram", e.target.value)} placeholder="@suamarca" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> WhatsApp de Contato</Label>
            <Input value={config.socials?.whatsapp} onChange={(e) => updateSocial("whatsapp", e.target.value)} placeholder="5511999999999" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Endereço Físico</Label>
            <Textarea value={config.address} onChange={(e) => updateField("address", e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Mensagem Final / Copyright</Label>
            <Input value={config.footer_message} onChange={(e) => updateField("footer_message", e.target.value)} />
          </div>
        </div>
      </Card>
    </div>
  );
}
