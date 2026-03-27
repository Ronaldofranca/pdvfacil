import { useState, useEffect } from "react";
import { BookOpen, Save, Eye, Palette, Layout, Settings2, Image, Type, Share2, PanelLeftClose, PanelLeftOpen, Smartphone, Tablet, Monitor, Sparkles, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCatalogoConfig, useUpsertCatalogoConfig, useCatalogoBanners } from "@/hooks/useCatalogo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CatalogSectionBuilder, CatalogSection } from "@/components/catalogo/CatalogSectionBuilder";
import { CatalogBannerManager } from "@/components/catalogo/CatalogBannerManager";
import { CatalogVisualEditor, CatalogTheme } from "@/components/catalogo/CatalogVisualEditor";
import { CatalogHeaderFooterEditor, CatalogHeaderFooter } from "@/components/catalogo/CatalogHeaderFooterEditor";
import { Badge } from "@/components/ui/badge";
import { useProdutos, useUpsertProduto } from "@/hooks/useProdutos";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/produtos/ImageUpload";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_SECTIONS: CatalogSection[] = [
  { id: "banners", label: "Slider de Banners", active: true },
  { id: "categories", label: "Categorias", active: true },
  { id: "featured", label: "Produtos em Destaque", active: true },
  { id: "promotions", label: "Ofertas Imperdíveis", active: true },
  { id: "new_arrivals", label: "Lançamentos", active: true },
  { id: "testimonials", label: "Depoimentos de Clientes", active: true },
  { id: "institutional", label: "Sobre a Marca", active: true },
  { id: "cta", label: "Chamada para Contato", active: true },
];

const DEFAULT_PRODUCT_SECTIONS: CatalogSection[] = [
  { id: "images", label: "Galeria de Imagens", active: true },
  { id: "info", label: "Informações Básicas", active: true },
  { id: "benefits", label: "Benefícios", active: true },
  { id: "use_mode", label: "Como Usar", active: true },
  { id: "differentials", label: "Diferenciais", active: true },
  { id: "testimonials", label: "Depoimentos", active: true },
  { id: "observations", label: "Observações", active: true },
];

export default function CatalogoAdminPage() {
  const { profile } = useAuth();
  const { data: config, isLoading } = useCatalogoConfig();
  const { data: banners } = useCatalogoBanners();
  const { data: produtos } = useProdutos();
  const upsert = useUpsertCatalogoConfig();
  const upsertProduto = useUpsertProduto();

  const [sections, setSections] = useState<CatalogSection[]>(DEFAULT_SECTIONS);
  const [productSections, setProductSections] = useState<CatalogSection[]>(DEFAULT_PRODUCT_SECTIONS);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [theme, setTheme] = useState<CatalogTheme>({
    primary: "#10b981",
    background: "#0f1117",
    text: "#f8fafc",
    button: "#10b981",
    typography: "Inter",
    cardStyle: "rounded",
  });
  const [headerFooter, setHeaderFooter] = useState<CatalogHeaderFooter>({
    brand_name: "",
    logo_url: "",
    socials: { instagram: "", whatsapp: "" },
    footer_message: "",
  });
  const [imagemInstitucionalUrl, setImagemInstitucionalUrl] = useState<string>("");

  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (config) {
      if (Array.isArray(config.secoes) && config.secoes.length > 0) {
        setSections(config.secoes as unknown as CatalogSection[]);
      }
      if (Array.isArray((config as any).secoes_produto) && (config as any).secoes_produto.length > 0) {
        setProductSections((config as any).secoes_produto as CatalogSection[]);
      }
      setImagemInstitucionalUrl(config.imagem_institucional_url || "");
      if (config.tema_config && typeof config.tema_config === 'object') {
        setTheme(config.tema_config as any);
      } else {
        // Fallback to old flat fields
        setTheme({
          primary: config.cor_primaria || "#10b981",
          background: config.cor_fundo || "#0f1117",
          text: "#f8fafc",
          button: config.cor_botoes || "#10b981",
          typography: config.tipografia || "Inter",
          cardStyle: (config.estilo_cards as any) || "rounded",
        });
      }
      if (config.header_config || config.footer_config) {
        setHeaderFooter({
          ...(config.header_config as any),
          ...(config.footer_config as any),
        });
      }
    }
  }, [config]);

  const handleSave = () => {
    if (!profile) return;
    upsert.mutate({
      empresa_id: profile.empresa_id,
      secoes: sections,
      secoes_produto: productSections,
      tema_config: theme,
      header_config: headerFooter,
      footer_config: headerFooter,
      imagem_institucional_url: imagemInstitucionalUrl,
      // Keep old fields for backward compatibility if needed
      cor_primaria: theme.primary,
      cor_fundo: theme.background,
      cor_botoes: theme.button,
      tipografia: theme.typography,
    } as any);
  };

  const toggleProductFlag = async (produtoId: string, flag: string, value: boolean) => {
    const { error } = await supabase
      .from("produtos")
      .update({ [flag]: value, updated_at: new Date().toISOString() } as any)
      .eq("id", produtoId);
    if (error) { toast.error(error.message); } else { toast.success("Produto atualizado"); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 animate-pulse">Carregando editor...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-6 overflow-hidden">
      {/* Header Admin */}
      <div className="flex items-center justify-between p-4 border-b bg-background z-20">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Editor do Catálogo</h1>
          <Badge variant="secondary" className="ml-2 font-mono text-[10px]">Versão Mini-Site</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <PanelLeftClose className="w-4 h-4 mr-2" /> : <PanelLeftOpen className="w-4 h-4 mr-2" />}
            Preview
          </Button>
          <Separator orientation="vertical" className="h-4 mx-2" />
          <Button variant="outline" size="sm" onClick={() => window.open("/catalogo", "_blank")}>
            <Eye className="w-4 h-4 mr-2" /> Visualizar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
            <Save className="w-4 h-4 mr-2" /> {upsert.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
          <div className="max-w-2xl mx-auto space-y-6">
            <Tabs defaultValue="secoes">
              <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-background border flex-wrap">
                <TabsTrigger value="secoes" className="gap-1.5"><Layout className="w-3.5 h-3.5" /> Site</TabsTrigger>
                <TabsTrigger value="produto_secoes" className="gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Página Produto</TabsTrigger>
                <TabsTrigger value="banners" className="gap-1.5"><Image className="w-3.5 h-3.5" /> Banners</TabsTrigger>
                <TabsTrigger value="visual" className="gap-1.5"><Palette className="w-3.5 h-3.5" /> Visual</TabsTrigger>
                <TabsTrigger value="header" className="gap-1.5"><Monitor className="w-3.5 h-3.5" /> Header/Footer</TabsTrigger>
                <TabsTrigger value="produtos" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Conteúdo</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="secoes" className="space-y-4 m-0">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Estrutura da Home</h3>
                    <p className="text-xs text-muted-foreground">Arraste ou use as setas para definir a ordem das seções na página inicial.</p>
                  </div>
                  <CatalogSectionBuilder sections={sections} onSectionsChange={setSections} />
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Image className="w-4 h-4" /> Foto Institucional
                      </h3>
                      <p className="text-xs text-muted-foreground">Esta imagem aparece na seção "Sobre a Marca" da sua Home.</p>
                    </div>
                    <Card className="p-4 bg-background/50">
                      <ImageUpload 
                        currentImageUrl={imagemInstitucionalUrl}
                        onImageUploaded={(url) => {
                          const finalUrl = typeof url === 'string' ? url : url.large;
                          setImagemInstitucionalUrl(finalUrl);
                        }}
                        onImageRemoved={() => setImagemInstitucionalUrl("")}
                        recommendedSize="1200 x 800 px"
                        aspectRatio={3/2}
                        storagePath="institucional"
                      />
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="produto_secoes" className="space-y-4 m-0">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Estrutura da Página de Produto</h3>
                    <p className="text-xs text-muted-foreground">Defina quais seções aparecem e em qual ordem na página individual do produto.</p>
                  </div>
                  <CatalogSectionBuilder sections={productSections} onSectionsChange={setProductSections} />
                </TabsContent>

                <TabsContent value="banners" className="m-0">
                  <CatalogBannerManager />
                </TabsContent>

                <TabsContent value="visual" className="m-0">
                  <CatalogVisualEditor theme={theme} onThemeChange={setTheme} />
                </TabsContent>

                <TabsContent value="header" className="m-0">
                  <CatalogHeaderFooterEditor config={headerFooter} onConfigChange={setHeaderFooter} />
                </TabsContent>

                <TabsContent value="produtos" className="m-0">
                  <Card className="p-4 space-y-4">
                     <h3 className="text-sm font-semibold">Produtos em Destaque</h3>
                     <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {produtos?.filter(p => p.ativo).map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                            <div>
                              <p className="font-medium text-xs truncate w-40">{p.nome}</p>
                              <p className="text-[10px] text-muted-foreground">{p.codigo}</p>
                            </div>
                            <div className="flex gap-1 flex-wrap justify-end">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingProduct(p)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {[
                                { key: "destaque", label: "Estrela", color: "default" as const },
                                { key: "promocao", label: "%", color: "destructive" as const },
                                { key: "lancamento", label: "Novo", color: "secondary" as const },
                              ].map((flag) => (
                                <Badge
                                  key={flag.key}
                                  variant={(p as any)[flag.key] ? flag.color : "outline"}
                                  className="cursor-pointer text-[9px] px-1.5"
                                  onClick={() => toggleProductFlag(p.id, flag.key, !(p as any)[flag.key])}
                                >
                                  {flag.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                     </div>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Live Preview Sidebar */}
        {showPreview && (
          <div className="hidden lg:flex flex-col w-[400px] border-l bg-muted/10">
            <div className="p-3 border-b flex items-center justify-between bg-background">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview Real-time</span>
              <div className="flex items-center gap-1">
                <Button variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setPreviewDevice("mobile")}>
                  <Smartphone className="w-3.5 h-3.5" />
                </Button>
                <Button variant={previewDevice === "tablet" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setPreviewDevice("tablet")}>
                  <Tablet className="w-3.5 h-3.5" />
                </Button>
                <Button variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setPreviewDevice("desktop")}>
                  <Monitor className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden p-4 flex justify-center bg-gray-200/50">
               <div className={`bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
                 previewDevice === "mobile" ? "w-[280px] h-[550px]" : 
                 previewDevice === "tablet" ? "w-[360px] h-[550px]" : "w-full h-full"
               } rounded-[2rem] border-[8px] border-gray-800 relative`}>
                 <div className="absolute inset-0 overflow-y-auto bg-[#0f1117] scrollbar-hide" style={{ backgroundColor: theme.background, fontFamily: theme.typography }}>
                   {/* Mini Header */}
                   <div className="p-4 flex items-center justify-between border-b border-white/5">
                     <span className="text-xs font-bold" style={{ color: theme.text }}>{headerFooter.brand_name || "Sua Marca"}</span>
                     <div className="w-5 h-5 rounded-full bg-white/10" />
                   </div>
                                     {/* Mini Site Sections */}
                   <div className="flex-1">
                     {sections.filter(s => s.active).map((s) => {
                       const sectionBg = theme.colors?.sectionBackground || "transparent";
                       const titleColor = theme.colors?.titles || theme.primary;
                       
                       return (
                         <div key={s.id} className="p-4 border-b border-white/5 min-h-[80px] flex flex-col justify-center" style={{ backgroundColor: sectionBg }}>
                           <span className="text-[10px] font-bold uppercase mb-1" style={{ color: titleColor }}>{s.label}</span>
                           
                           {/* Mini Product Card Simulation */}
                           <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/10 space-y-1">
                             <div className="aspect-square w-full rounded bg-white/10 mb-2" />
                             {theme.visibility?.productTitle && <div className="h-2 w-full rounded bg-white/10" style={{ backgroundColor: theme.colors?.productName || "rgba(255,255,255,0.1)" }} />}
                             {theme.visibility?.productPrice && <div className="h-2 w-1/2 rounded bg-white/10" style={{ backgroundColor: theme.colors?.productPrice || "rgba(255,255,255,0.1)" }} />}
                             {theme.visibility?.productAction && <div className="h-4 w-full rounded mt-2" style={{ backgroundColor: theme.button }} />}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                   
                   {/* Mini Footer */}
                   <div className="p-6 text-center space-y-2 opacity-50">
                     <div className="w-10 h-1 rounded bg-white/10 mx-auto" />
                     <p className="text-[8px]" style={{ color: theme.text }}>{headerFooter.footer_message || "© 2026 Catálogo"}</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>
      {/* Rich Product Content Editor Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader>
              <DialogTitle>Conteúdo Rico: {editingProduct.nome}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                {/* Benefits */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-wider opacity-60">Benefícios</Label>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const current = editingProduct.beneficios || [];
                      setEditingProduct({ ...editingProduct, beneficios: [...current, ""] });
                    }}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {(editingProduct.beneficios || []).map((b: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Input value={b} onChange={(e) => {
                        const next = [...editingProduct.beneficios];
                        next[i] = e.target.value;
                        setEditingProduct({ ...editingProduct, beneficios: next });
                      }} />
                      <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 shrink-0" onClick={() => {
                        const next = editingProduct.beneficios.filter((_: any, idx: number) => idx !== i);
                        setEditingProduct({ ...editingProduct, beneficios: next });
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Modo de Uso */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold uppercase tracking-wider opacity-60">Modo de Uso</Label>
                  <Textarea 
                    value={editingProduct.modo_uso} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, modo_uso: e.target.value })}
                    rows={4}
                    placeholder="Instruções passo a passo..."
                  />
                </div>

                {/* Diferenciais */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-wider opacity-60">Diferenciais</Label>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const current = editingProduct.diferenciais || [];
                      setEditingProduct({ ...editingProduct, diferenciais: [...current, ""] });
                    }}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {(editingProduct.diferenciais || []).map((d: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Input value={d} onChange={(e) => {
                        const next = [...editingProduct.diferenciais];
                        next[i] = e.target.value;
                        setEditingProduct({ ...editingProduct, diferenciais: next });
                      }} />
                      <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 shrink-0" onClick={() => {
                        const next = editingProduct.diferenciais.filter((_: any, idx: number) => idx !== i);
                        setEditingProduct({ ...editingProduct, diferenciais: next });
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold uppercase tracking-wider opacity-60">Observações Extras</Label>
                  <Input value={editingProduct.observacoes} onChange={(e) => setEditingProduct({ ...editingProduct, observacoes: e.target.value })} placeholder="Ex: Prazo de entrega estendido..." />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button variant="ghost" onClick={() => setEditingProduct(null)}>Cancelar</Button>
              <Button onClick={async () => {
                await upsertProduto.mutateAsync(editingProduct);
                setEditingProduct(null);
              }} disabled={upsertProduto.isPending}>
                {upsertProduto.isPending ? "Salvando..." : "Salvar Conteúdo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const Separator = ({ className, orientation }: { className?: string, orientation?: "horizontal" | "vertical" }) => (
  <div className={`${className} bg-border ${orientation === "vertical" ? "w-[1px]" : "h-[1px]"}`} />
);
