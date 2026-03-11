import { useState, useEffect } from "react";
import { BookOpen, Save, Eye, Palette, Layout, Settings2, Image, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCatalogoConfig, useUpsertCatalogoConfig } from "@/hooks/useCatalogo";
import { useProdutos } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export default function CatalogoAdminPage() {
  const { profile } = useAuth();
  const { data: config, isLoading } = useCatalogoConfig();
  const upsert = useUpsertCatalogoConfig();
  const { data: produtos } = useProdutos();

  const [form, setForm] = useState({
    titulo: "Nosso Catálogo",
    subtitulo: "",
    descricao: "",
    banner_url: "",
    whatsapp_numero: "",
    cor_primaria: "#10b981",
    cor_secundaria: "#1e293b",
    cor_fundo: "#0f1117",
    cor_botoes: "#10b981",
    tipografia: "Inter",
    estilo_cards: "rounded",
    secao_destaque: true,
    secao_categorias: true,
    secao_testemunhos: true,
    secao_beneficios: true,
    secao_cta: true,
    beneficios: [] as { icone: string; titulo: string; descricao: string }[],
    cta_titulo: "",
    cta_descricao: "",
    cta_botao_texto: "Fale Conosco",
    cta_botao_link: "",
    seo_titulo: "",
    seo_descricao: "",
  });

  useEffect(() => {
    if (config) {
      setForm({
        titulo: config.titulo || "Nosso Catálogo",
        subtitulo: config.subtitulo || "",
        descricao: config.descricao || "",
        banner_url: config.banner_url || "",
        whatsapp_numero: config.whatsapp_numero || "",
        cor_primaria: config.cor_primaria || "#10b981",
        cor_secundaria: config.cor_secundaria || "#1e293b",
        cor_fundo: config.cor_fundo || "#0f1117",
        cor_botoes: config.cor_botoes || "#10b981",
        tipografia: config.tipografia || "Inter",
        estilo_cards: config.estilo_cards || "rounded",
        secao_destaque: config.secao_destaque ?? true,
        secao_categorias: config.secao_categorias ?? true,
        secao_testemunhos: config.secao_testemunhos ?? true,
        secao_beneficios: config.secao_beneficios ?? true,
        secao_cta: config.secao_cta ?? true,
        beneficios: Array.isArray(config.beneficios) ? (config.beneficios as any[]) : [],
        cta_titulo: config.cta_titulo || "",
        cta_descricao: config.cta_descricao || "",
        cta_botao_texto: config.cta_botao_texto || "Fale Conosco",
        cta_botao_link: config.cta_botao_link || "",
        seo_titulo: config.seo_titulo || "",
        seo_descricao: config.seo_descricao || "",
      });
    }
  }, [config]);

  const handleSave = () => {
    if (!profile) return;
    upsert.mutate({
      empresa_id: profile.empresa_id,
      ...form,
      beneficios: form.beneficios,
    });
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addBeneficio = () => {
    setForm((prev) => ({
      ...prev,
      beneficios: [...prev.beneficios, { icone: "✨", titulo: "", descricao: "" }],
    }));
  };

  const updateBeneficio = (idx: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      beneficios: prev.beneficios.map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    }));
  };

  const removeBeneficio = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      beneficios: prev.beneficios.filter((_, i) => i !== idx),
    }));
  };

  // Toggle product flags
  const toggleProductFlag = async (produtoId: string, flag: string, value: boolean) => {
    const { error } = await supabase
      .from("produtos")
      .update({ [flag]: value, updated_at: new Date().toISOString() } as any)
      .eq("id", produtoId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Produto atualizado");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Catálogo Online</h1>
            <p className="text-sm text-muted-foreground">Configure seu mini site de catálogo</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/catalogo" target="_blank" rel="noopener noreferrer" className="gap-1.5">
              <Eye className="w-4 h-4" /> Visualizar
            </a>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={upsert.isPending}>
            <Save className="w-4 h-4" /> {upsert.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="conteudo">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="conteudo" className="gap-1.5"><Layout className="w-3.5 h-3.5" /> Conteúdo</TabsTrigger>
          <TabsTrigger value="visual" className="gap-1.5"><Palette className="w-3.5 h-3.5" /> Visual</TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1.5"><Image className="w-3.5 h-3.5" /> Destaques</TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5"><Settings2 className="w-3.5 h-3.5" /> SEO</TabsTrigger>
        </TabsList>

        {/* CONTEÚDO */}
        <TabsContent value="conteudo" className="space-y-6 mt-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Página Inicial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título Principal</Label>
                <Input value={form.titulo} onChange={(e) => updateField("titulo", e.target.value)} />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input value={form.subtitulo} onChange={(e) => updateField("subtitulo", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => updateField("descricao", e.target.value)} rows={3} />
            </div>
            <div>
              <Label>URL do Banner</Label>
              <Input value={form.banner_url} onChange={(e) => updateField("banner_url", e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>WhatsApp (com DDD)</Label>
              <Input value={form.whatsapp_numero} onChange={(e) => updateField("whatsapp_numero", e.target.value)} placeholder="5511999999999" />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Seções Visíveis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "secao_destaque", label: "Produtos em Destaque" },
                { key: "secao_categorias", label: "Categorias" },
                { key: "secao_testemunhos", label: "Depoimentos" },
                { key: "secao_beneficios", label: "Benefícios da Marca" },
                { key: "secao_cta", label: "Chamada para Ação" },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm font-medium">{s.label}</span>
                  <Switch
                    checked={(form as any)[s.key]}
                    onCheckedChange={(v) => updateField(s.key, v)}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Benefícios da Marca</h3>
              <Button variant="outline" size="sm" onClick={addBeneficio}>Adicionar</Button>
            </div>
            {form.beneficios.map((b, idx) => (
              <div key={idx} className="grid grid-cols-[60px_1fr_1fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Ícone</Label>
                  <Input value={b.icone} onChange={(e) => updateBeneficio(idx, "icone", e.target.value)} className="text-center" />
                </div>
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input value={b.titulo} onChange={(e) => updateBeneficio(idx, "titulo", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Input value={b.descricao} onChange={(e) => updateBeneficio(idx, "descricao", e.target.value)} />
                </div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeBeneficio(idx)}>✕</Button>
              </div>
            ))}
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Chamada para Ação (CTA)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título</Label>
                <Input value={form.cta_titulo} onChange={(e) => updateField("cta_titulo", e.target.value)} />
              </div>
              <div>
                <Label>Texto do Botão</Label>
                <Input value={form.cta_botao_texto} onChange={(e) => updateField("cta_botao_texto", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.cta_descricao} onChange={(e) => updateField("cta_descricao", e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Link do Botão</Label>
              <Input value={form.cta_botao_link} onChange={(e) => updateField("cta_botao_link", e.target.value)} placeholder="https://wa.me/..." />
            </div>
          </Card>
        </TabsContent>

        {/* VISUAL */}
        <TabsContent value="visual" className="space-y-6 mt-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Palette className="w-4 h-4" /> Cores</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "cor_primaria", label: "Primária" },
                { key: "cor_secundaria", label: "Secundária" },
                { key: "cor_fundo", label: "Fundo" },
                { key: "cor_botoes", label: "Botões" },
              ].map((c) => (
                <div key={c.key}>
                  <Label className="text-xs">{c.label}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={(form as any)[c.key]}
                      onChange={(e) => updateField(c.key, e.target.value)}
                      className="w-10 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={(form as any)[c.key]}
                      onChange={(e) => updateField(c.key, e.target.value)}
                      className="flex-1 text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Type className="w-4 h-4" /> Tipografia e Estilo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fonte</Label>
                <Select value={form.tipografia} onValueChange={(v) => updateField("tipografia", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estilo dos Cards</Label>
                <Select value={form.estilo_cards} onValueChange={(v) => updateField("estilo_cards", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARD_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-6 space-y-3" style={{ backgroundColor: form.cor_fundo, fontFamily: form.tipografia }}>
            <p className="text-xs text-muted-foreground">Preview</p>
            <h2 className="text-2xl font-bold" style={{ color: form.cor_primaria }}>{form.titulo || "Título"}</h2>
            <p style={{ color: "#9ca3af" }}>{form.descricao || "Descrição do catálogo"}</p>
            <button
              className="px-6 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: form.cor_botoes,
                color: form.cor_fundo,
                borderRadius: form.estilo_cards === "sharp" ? "4px" : form.estilo_cards === "rounded" ? "12px" : "8px",
              }}
            >
              {form.cta_botao_texto || "Botão"}
            </button>
          </Card>
        </TabsContent>

        {/* DESTAQUES */}
        <TabsContent value="produtos" className="space-y-6 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4">Marcar produtos para exibição no catálogo</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {produtos?.filter(p => p.ativo).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm text-foreground">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.codigo}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {[
                      { key: "destaque", label: "Destaque", color: "default" as const },
                      { key: "promocao", label: "Promoção", color: "destructive" as const },
                      { key: "mais_vendido", label: "Mais Vendido", color: "secondary" as const },
                      { key: "lancamento", label: "Lançamento", color: "outline" as const },
                    ].map((flag) => (
                      <Badge
                        key={flag.key}
                        variant={(p as any)[flag.key] ? flag.color : "outline"}
                        className="cursor-pointer text-[10px] select-none"
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

        {/* SEO */}
        <TabsContent value="seo" className="space-y-6 mt-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground">SEO do Catálogo</h3>
            <div>
              <Label>Título SEO</Label>
              <Input value={form.seo_titulo} onChange={(e) => updateField("seo_titulo", e.target.value)} placeholder="Título para motores de busca" />
            </div>
            <div>
              <Label>Descrição SEO</Label>
              <Textarea value={form.seo_descricao} onChange={(e) => updateField("seo_descricao", e.target.value)} rows={3} placeholder="Descrição para motores de busca" />
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-foreground">SEO dos Produtos</h3>
            <p className="text-sm text-muted-foreground">Configure slug e SEO de cada produto na página de Produtos, aba de edição.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
