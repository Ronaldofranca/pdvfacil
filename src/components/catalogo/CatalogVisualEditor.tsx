import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Palette, Type, Eye, ShoppingBag, Settings2 } from "lucide-react";

export interface CatalogTheme {
  primary: string;
  background: string;
  text: string;
  button: string;
  typography: string;
  cardStyle: "rounded" | "sharp" | "minimal" | "shadow";
  
  // New granular settings
  colors?: {
    sectionBackground?: string;
    titles?: string;
    subtitles?: string;
    productName?: string;
    productPrice?: string;
    categoryText?: string;
    categoryBadge?: string;
    borders?: string;
    headerBackground?: string;
    footerBackground?: string;
  };
  
  sizes?: {
    productName?: string;
    productPrice?: string;
    categoryText?: string;
    sectionTitle?: string;
    headerText?: string;
    footerText?: string;
  };

  visibility?: {
    productTitle?: boolean;
    productPrice?: boolean;
    productDescription?: boolean;
    productCategory?: boolean;
    productAction?: boolean;
    productBadges?: boolean;
    categoriesOnHome?: boolean;
    categoriesOnCard?: boolean;
    headerElements?: boolean;
    footerElements?: boolean;
  };
}

interface CatalogVisualEditorProps {
  theme: CatalogTheme;
  onThemeChange: (theme: CatalogTheme) => void;
}

const FONTS = [
  { value: "Inter", label: "Inter (Moderna)" },
  { value: "Georgia", label: "Georgia (Elegante)" },
  { value: "Playfair Display", label: "Playfair Display (Premium)" },
  { value: "Poppins", label: "Poppins (Amigável)" },
  { value: "Roboto", label: "Roboto (Clean)" },
];

const CARD_STYLES = [
  { value: "rounded", label: "Arredondado" },
  { value: "sharp", label: "Reto" },
  { value: "minimal", label: "Minimalista" },
  { value: "shadow", label: "Com Sombra" },
];

const FONT_SIZES = [
  { value: "text-xs", label: "Extra Pequeno" },
  { value: "text-sm", label: "Pequeno" },
  { value: "text-base", label: "Normal" },
  { value: "text-lg", label: "Grande" },
  { value: "text-xl", label: "Extra Grande" },
  { value: "text-2xl", label: "Título" },
];

export function CatalogVisualEditor({ theme, onThemeChange }: CatalogVisualEditorProps) {
  // Initialize nested objects if they don't exist
  const safeTheme = React.useMemo(() => ({
    ...theme,
    colors: theme.colors || {},
    sizes: theme.sizes || {},
    visibility: {
      productTitle: true,
      productPrice: true,
      productCategory: true,
      productAction: true,
      productBadges: true,
      categoriesOnHome: true,
      categoriesOnCard: true,
      headerElements: true,
      footerElements: true,
      ...theme.visibility
    }
  }), [theme]);

  const updateField = (path: string, value: any) => {
    const parts = path.split(".");
    if (parts.length === 1) {
      onThemeChange({ ...theme, [parts[0]]: value });
    } else {
      const [obj, field] = parts;
      onThemeChange({
        ...theme,
        [obj]: { ...((theme as any)[obj] || {}), [field]: value }
      });
    }
  };

  const ColorInput = ({ label, path }: { label: string, path: string }) => {
    const value = path.split(".").reduce((acc, part) => acc && acc[part], safeTheme as any) || "#ffffff";
    return (
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => updateField(path, e.target.value)}
            className="w-8 h-8 rounded-lg border cursor-pointer overflow-hidden"
          />
          <Input
            value={value}
            onChange={(e) => updateField(path, e.target.value)}
            className="h-8 text-[10px] font-mono"
          />
        </div>
      </div>
    );
  };

  const SizeSelect = ({ label, path }: { label: string, path: string }) => {
    const value = path.split(".").reduce((acc, part) => acc && acc[part], safeTheme as any) || "text-base";
    return (
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{label}</Label>
        <Select value={value} onValueChange={(v) => updateField(path, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const VisibilitySwitch = ({ label, path }: { label: string, path: string }) => {
    const value = path.split(".").reduce((acc, part) => acc && acc[part], safeTheme as any);
    return (
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-transparent hover:border-primary/20 transition-all">
        <Label className="text-xs cursor-pointer" onClick={() => updateField(path, !value)}>{label}</Label>
        <Switch checked={!!value} onCheckedChange={(v) => updateField(path, v)} />
      </div>
    );
  };

  return (
    <Tabs defaultValue="geral" className="w-full">
      <TabsList className="w-full grid grid-cols-4 mb-4 h-9 p-1">
        <TabsTrigger value="geral" className="text-[10px] uppercase"><Settings2 className="w-3 h-3 mr-1" /> Geral</TabsTrigger>
        <TabsTrigger value="produtos" className="text-[10px] uppercase"><ShoppingBag className="w-3 h-3 mr-1" /> Itens</TabsTrigger>
        <TabsTrigger value="cores" className="text-[10px] uppercase"><Palette className="w-3 h-3 mr-1" /> Cores</TabsTrigger>
        <TabsTrigger value="visibilidade" className="text-[10px] uppercase"><Eye className="w-3 h-3 mr-1" /> Visib.</TabsTrigger>
      </TabsList>

      <TabsContent value="geral" className="space-y-4 m-0">
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ColorInput label="Cor Primária" path="primary" />
            <ColorInput label="Fundo da Página" path="background" />
            <ColorInput label="Cor do Texto" path="text" />
            <ColorInput label="Cor dos Botões" path="button" />
          </div>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Tipografia Global</Label>
              <Select value={safeTheme.typography} onValueChange={(v) => updateField("typography", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estilo Visual (Cards)</Label>
              <Select value={safeTheme.cardStyle} onValueChange={(v) => updateField("cardStyle", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARD_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="produtos" className="space-y-4 m-0">
        <Card className="p-4 space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-tighter text-primary">Estilo dos Cards de Produto</h4>
          <div className="grid grid-cols-2 gap-4">
            <ColorInput label="Nome do Produto" path="colors.productName" />
            <ColorInput label="Preço" path="colors.productPrice" />
            <SizeSelect label="Tam. Nome" path="sizes.productName" />
            <SizeSelect label="Tam. Preço" path="sizes.productPrice" />
          </div>
          <Separator className="opacity-50" />
          <h4 className="text-[11px] font-black uppercase tracking-tighter text-primary">Categorias e Badges</h4>
          <div className="grid grid-cols-2 gap-4">
            <ColorInput label="Texto Categoria" path="colors.categoryText" />
            <ColorInput label="Fundo Categoria" path="colors.categoryBadge" />
            <SizeSelect label="Tam. Fonte" path="sizes.categoryText" />
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="cores" className="space-y-4 m-0">
        <Card className="p-4 space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-tighter text-primary">Layout e Estrutura</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <ColorInput label="Fundo de Seção" path="colors.sectionBackground" />
            <ColorInput label="Títulos Seção" path="colors.titles" />
            <ColorInput label="Bordas" path="colors.borders" />
            <ColorInput label="Fundo Header" path="colors.headerBackground" />
            <ColorInput label="Fundo Footer" path="colors.footerBackground" />
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="visibilidade" className="space-y-4 m-0">
        <Card className="p-3 space-y-2">
          <h4 className="text-[11px] font-black uppercase tracking-tighter text-primary mb-2">Visibilidade de Elementos</h4>
          <VisibilitySwitch label="Título do Produto" path="visibility.productTitle" />
          <VisibilitySwitch label="Preço do Produto" path="visibility.productPrice" />
          <VisibilitySwitch label="Descrição Curta" path="visibility.productDescription" />
          <VisibilitySwitch label="Tag de Categoria" path="visibility.productCategory" />
          <VisibilitySwitch label="Selos (Promo/Novo)" path="visibility.productBadges" />
          <VisibilitySwitch label="Botão de Ação" path="visibility.productAction" />
          <Separator className="my-2 opacity-50" />
          <VisibilitySwitch label="Categorias na Home" path="visibility.categoriesOnHome" />
          <VisibilitySwitch label="Elementos do Topo" path="visibility.headerElements" />
          <VisibilitySwitch label="Elementos do Rodapé" path="visibility.footerElements" />
        </Card>
      </TabsContent>
    </Tabs>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={`h-px w-full bg-border ${className}`} />;
