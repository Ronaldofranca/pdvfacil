import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Sparkles, ArrowRight, ChevronRight, MessageCircle, Heart, Zap, Award } from "lucide-react";
import { normalizeSearch } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  useCatalogoProdutos, 
  useCatalogoCategorias, 
  useCatalogoTestemunhos, 
  useCatalogoConfig, 
  useCatalogoBanners 
} from "@/hooks/useCatalogo";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function CatalogoPublicoPage() {
  const { data: config } = useCatalogoConfig();
  const { data: banners } = useCatalogoBanners();
  const { data: allProdutos, isLoading } = useCatalogoProdutos();
  const { data: categorias } = useCatalogoCategorias();
  const { data: testemunhos } = useCatalogoTestemunhos();
  
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const theme = useMemo(() => {
    const raw = (config?.tema_config as any) || {};
    return {
      primary: raw.primary || config?.cor_primaria || "#10b981",
      background: raw.background || config?.cor_fundo || "#0f1117",
      text: raw.text || "#f8fafc",
      button: raw.button || config?.cor_botoes || "#10b981",
      typography: raw.typography || config?.tipografia || "Inter",
      cardStyle: raw.cardStyle || config?.estilo_cards || "rounded",
      colors: raw.colors || {},
      sizes: raw.sizes || {},
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
        ...raw.visibility
      }
    };
  }, [config]);

  // Inject CSS variables for global styling
  const themeStyles = useMemo(() => `
    :root {
      --cat-primary: ${theme.primary};
      --cat-bg: ${theme.background};
      --cat-text: ${theme.text};
      --cat-button: ${theme.button};
      --cat-section-bg: ${theme.colors.sectionBackground || 'transparent'};
      --cat-title-color: ${theme.colors.titles || theme.text};
      --cat-subtitle-color: ${theme.colors.subtitles || theme.text + 'cc'};
      --cat-product-name-color: ${theme.colors.productName || theme.text};
      --cat-product-price-color: ${theme.colors.productPrice || theme.primary};
      --cat-category-text-color: ${theme.colors.categoryText || theme.text};
      --cat-category-bg-color: ${theme.colors.categoryBadge || theme.primary + '20'};
      --cat-border-color: ${theme.colors.borders || 'rgba(255,255,255,0.05)'};
      --cat-header-bg: ${theme.colors.headerBackground || theme.background};
      --cat-footer-bg: ${theme.colors.footerBackground || theme.background};
    }
  `, [theme]);

  const headerFooter = {
    ...(config?.header_config as any),
    ...(config?.footer_config as any),
  };

  const secoes = (config?.secoes as any[]) || [
    { id: "banners", active: true },
    { id: "categories", active: true },
    { id: "featured", active: true },
    { id: "products", active: true }
  ];

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = useMemo(() => 
    allProdutos
      ?.filter((p) => normalizeSearch(p.nome).includes(normalizeSearch(search)))
      .filter((p) => !catFilter || p.categoria_id === catFilter),
    [allProdutos, search, catFilter]
  );

  const getProductUrl = (p: any) => p.slug || p.id;
  const getMainImage = (p: any) => {
    const principal = p.produto_imagens?.find((i: any) => i.principal);
    return principal?.url || p.produto_imagens?.[0]?.url || p.imagem_url;
  };

  const renderSection = (section: any) => {
    if (!section.active) return null;

    switch (section.id) {
      case "banners":
        if (!banners || banners.length === 0) return null;
        return (
          <section key="banners" className="relative">
            <Carousel 
              className="w-full"
              opts={{ loop: true }}
            >
              <CarouselContent>
                {banners.filter(b => b.ativo).map((b) => (
                  <CarouselItem key={b.id}>
                    <div className="relative h-[50vh] md:h-[70vh] w-full overflow-hidden">
                      <img src={b.imagem_url} alt={b.titulo} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-20 max-w-6xl mx-auto">
                        {b.subtitulo && (
                          <Badge className="mb-4" style={{ backgroundColor: theme.primary, color: theme.background }}>
                            {b.subtitulo}
                          </Badge>
                        )}
                        <h2 className="text-4xl md:text-7xl font-bold text-white mb-4 leading-tight">{b.titulo}</h2>
                        {b.link && (
                          <Link to={b.link}>
                            <Button size="lg" className="rounded-full px-8" style={{ backgroundColor: theme.button, color: theme.background }}>
                              Ver mais <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {banners.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 bg-black/20 text-white border-0 hover:bg-black/40" />
                  <CarouselNext className="right-4 bg-black/20 text-white border-0 hover:bg-black/40" />
                </>
              )}
            </Carousel>
          </section>
        );

      case "categories":
        if (!categorias || categorias.length === 0 || !theme.visibility.categoriesOnHome) return null;
        return (
          <section key="categories" className="px-6 py-12 scroll-mt-20" style={{ backgroundColor: "var(--cat-section-bg)" }}>
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide">
                <Button 
                  onClick={() => setCatFilter(null)}
                  variant={!catFilter ? "default" : "outline"}
                  className="rounded-full px-6"
                  style={!catFilter ? { backgroundColor: theme.primary, color: theme.background } : {}}
                >
                  Todos
                </Button>
                {categorias.map(c => (
                  <Button 
                    key={c.id}
                    onClick={() => setCatFilter(c.id === catFilter ? null : c.id)}
                    variant={catFilter === c.id ? "default" : "outline"}
                    className="rounded-full px-6"
                    style={catFilter === c.id ? { backgroundColor: theme.primary, color: theme.background } : {}}
                  >
                    {c.nome}
                  </Button>
                ))}
              </div>
            </div>
          </section>
        );

      case "featured":
        const featured = allProdutos?.filter(p => (p as any).destaque).slice(0, 4);
        if (!featured?.length) return null;
        return (
          <section key="featured" className="px-6 pb-16" style={{ backgroundColor: "var(--cat-section-bg)" }}>
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--cat-title-color)" }}>✨ Destaques</h2>
                <Link to="/catalogo/produtos" className="text-sm font-medium flex items-center gap-1" style={{ color: "var(--cat-primary)" }}>
                  Ver todos <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {featured.map(p => (
                  <ProductCard key={p.id} p={p} theme={theme} fmt={fmt} getMainImage={getMainImage} getProductUrl={getProductUrl} />
                ))}
              </div>
            </div>
          </section>
        );

      case "promotions":
        const promos = allProdutos?.filter(p => (p as any).promocao).slice(0, 4);
        if (!promos?.length) return null;
        return (
          <section key="promotions" className="px-6 pb-16">
            <div className="max-w-6xl mx-auto bg-destructive/5 border border-destructive/10 p-8 rounded-[2rem]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
                  <Zap className="w-6 h-6 text-destructive fill-destructive" /> Ofertas Imperdíveis
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {promos.map(p => (
                  <ProductCard key={p.id} p={p} theme={theme} fmt={fmt} getMainImage={getMainImage} getProductUrl={getProductUrl} />
                ))}
              </div>
            </div>
          </section>
        );

      case "testimonials":
        if (!testemunhos?.length) return null;
        return (
          <section key="testimonials" className="px-6 pb-20" style={{ backgroundColor: "var(--cat-section-bg)" }}>
            <div className="max-w-6xl mx-auto text-center space-y-8">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: theme.text }}>O que dizem sobre nós</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testemunhos.slice(0, 3).map(t => (
                  <Card key={t.id} className="p-8 space-y-4 bg-white/5 border-white/10 rounded-2xl">
                    <div className="flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < t.nota ? "fill-current" : ""}`} style={{ color: i < t.nota ? theme.primary : "transparent", stroke: i < t.nota ? theme.primary : "#444" }} />
                      ))}
                    </div>
                    <p className="italic text-lg" style={{ color: theme.text }}>"{t.texto}"</p>
                    <div className="flex flex-col items-center gap-2 pt-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}>
                        {t.nome_cliente.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-bold" style={{ color: theme.text }}>{t.nome_cliente}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        );

      case "institutional":
        if (!config?.descricao) return null;
        return (
          <section key="institutional" className="px-6 py-20 border-y border-white/5 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {config.imagem_institucional_url ? (
                  <div className="relative aspect-[3/2] overflow-hidden rounded-3xl shadow-2xl group">
                    <img 
                      src={config.imagem_institucional_url} 
                      alt={headerFooter.brand_name || "Nossa História"} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className="hidden md:flex aspect-[3/2] bg-primary/5 rounded-3xl items-center justify-center border border-dashed border-primary/20">
                    <Sparkles className="w-12 h-12 text-primary/20" />
                  </div>
                )}
                
                <div className="space-y-8 text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: theme.text }}>
                    {headerFooter.brand_name || "Nossa História"}
                  </h2>
                  <p className="text-lg md:text-xl leading-relaxed opacity-80" style={{ color: theme.text }}>
                    {config.descricao}
                  </p>
                  {headerFooter.socials?.instagram && (
                    <div className="pt-2">
                      <a href={`https://instagram.com/${headerFooter.socials.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="rounded-full gap-2 px-8 py-6 text-lg border-white/20 hover:bg-white/10 transition-all">
                          Siga-nos no Instagram
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case "cta":
        if (!config?.cta_titulo) return null;
        return (
          <section key="cta" className="px-6 py-20">
            <div className="max-w-4xl mx-auto text-center p-12 md:p-20 rounded-[3rem]" style={{ background: `linear-gradient(135deg, ${theme.primary}20, ${theme.primary}05)`, border: `1px solid ${theme.primary}30` }}>
              <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ color: theme.text }}>{config.cta_titulo}</h2>
              <p className="text-lg md:text-xl mb-10 opacity-80" style={{ color: theme.text }}>{config.cta_descricao}</p>
              <a href={config.cta_botao_link} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="rounded-full px-12 py-8 text-xl gap-3 shadow-xl" style={{ backgroundColor: theme.button, color: theme.background }}>
                  <MessageCircle className="w-6 h-6" /> {config.cta_botao_texto || "Falar Agora"}
                </Button>
              </a>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "var(--cat-bg)", fontFamily: theme.typography }}>
      <style>{themeStyles}</style>

      {/* Header */}
      {theme.visibility.headerElements && (
        <header className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md border-b border-[var(--cat-border-color)] bg-opacity-80" style={{ backgroundColor: "var(--cat-header-bg)" }}>
          <div className="flex items-center gap-3">
            {headerFooter.logo_url && <img src={headerFooter.logo_url} className="h-8 w-auto" alt="Logo" />}
            <span className="text-xl font-black tracking-tighter" style={{ color: "var(--cat-text)" }}>
              {headerFooter.brand_name || "PDV FÁCIL"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/catalogo/produtos" className="text-sm font-medium hidden sm:block" style={{ color: "var(--cat-text)" }}>Todos os Produtos</Link>
            <a href={`https://wa.me/${config?.whatsapp_numero}`} target="_blank" rel="noopener noreferrer">
               <Button size="sm" className="rounded-full" style={{ backgroundColor: "var(--cat-primary)", color: "var(--cat-bg)" }}>Contatos</Button>
            </a>
          </div>
        </header>
      )}
    
      {/* Search Overlay */}
      <div className="px-6 pt-8 max-w-2xl mx-auto -mb-4 relative z-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 group-focus-within:opacity-100 transition-opacity" style={{ color: theme.text }} />
          <Input 
            className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 transition-colors shadow-2xl text-lg backdrop-blur"
            style={{ color: theme.text }}
            placeholder="O que você está procurando?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {search ? (
        <section className="px-6 py-12 max-w-6xl mx-auto">
          <h2 className="text-xl font-bold mb-8 opacity-60" style={{ color: theme.text }}>Resultados para: {search}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered?.map(p => (
              <ProductCard key={p.id} p={p} theme={theme} fmt={fmt} getMainImage={getMainImage} getProductUrl={getProductUrl} />
            ))}
          </div>
        </section>
      ) : (
        secoes.map(renderSection)
      )}

      {/* Floating Action Button for WhatsApp */}
      {config?.whatsapp_numero && (
        <a href={`https://wa.me/${config.whatsapp_numero}`} target="_blank" rel="noopener noreferrer" 
           className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform"
           style={{ backgroundColor: "#25d366" }}>
          <MessageCircle className="w-8 h-8 text-white fill-white" />
        </a>
      )}

      {/* Footer */}
      <footer className="mt-20 px-6 py-12 border-t border-white/5 text-center space-y-8" style={{ backgroundColor: theme.background }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
             <div className="space-y-4">
               <h3 className="font-black text-xl tracking-tighter" style={{ color: theme.text }}>{headerFooter.brand_name || "PDV FÁCIL"}</h3>
               <p className="text-sm opacity-60 leading-relaxed" style={{ color: theme.text }}>{config?.descricao?.substring(0, 100)}...</p>
             </div>
             <div className="space-y-4">
               <h4 className="font-bold text-sm uppercase tracking-widest opacity-40" style={{ color: theme.text }}>Contato</h4>
               <p className="text-sm flex items-center gap-2" style={{ color: theme.text }}><MapPin className="w-4 h-4" /> {headerFooter.address || "Brasil"}</p>
               <p className="text-sm flex items-center gap-2" style={{ color: theme.text }}><MessageCircle className="w-4 h-4" /> {config?.whatsapp_numero}</p>
             </div>
          </div>
          <div className="pt-12 flex flex-col items-center gap-4">
             <p className="text-xs opacity-30" style={{ color: theme.text }}>
               {headerFooter.footer_message || `© ${new Date().getFullYear()} — Todos os direitos reservados.`}
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ p, theme, fmt, getMainImage, getProductUrl }: any) {
  const radius = theme.cardStyle === "sharp" ? "rounded-none" : theme.cardStyle === "minimal" ? "rounded-lg" : "rounded-3xl";
  const { visibility, sizes } = theme;

  return (
    <Link to={`/catalogo/${getProductUrl(p)}`} className="group">
      <div className={`relative aspect-[3/4] ${radius} overflow-hidden bg-white/5 mb-4 group-hover:shadow-2xl transition-all duration-500 border border-[var(--cat-border-color)]`}>
        {getMainImage(p) ? (
          <img src={getMainImage(p)} alt={p.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20"><Sparkles className="w-12 h-12" /></div>
        )}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
           {visibility.productBadges && p.promocao && <Badge className="bg-destructive text-white border-0 text-[10px] font-bold">PROMO</Badge>}
           {visibility.productBadges && p.lancamento && <Badge className="text-black border-0 text-[10px] font-bold" style={{ backgroundColor: "var(--cat-primary)" }}>NOVO</Badge>}
        </div>
      </div>
      
      {visibility.productTitle && (
        <h3 className={`font-bold truncate mb-1 ${sizes.productName || "text-base"}`} style={{ color: "var(--cat-product-name-color)" }}>
          {p.nome}
        </h3>
      )}

      {visibility.productCategory && p.categorias && (
        <p className={`opacity-60 mb-1 ${sizes.categoryText || "text-[10px]"}`} style={{ color: "var(--cat-category-text-color)" }}>
          {p.categorias.nome}
        </p>
      )}

      {visibility.productPrice && (
        <p className={`font-black ${sizes.productPrice || "text-xl"}`} style={{ color: "var(--cat-product-price-color)" }}>
          {fmt(Number(p.preco))}
        </p>
      )}

      {visibility.productAction && (
        <Button className="w-full mt-4 rounded-full h-10 text-xs font-bold" style={{ backgroundColor: "var(--cat-button)", color: "var(--cat-bg)" }}>
          Ver Detalhes
        </Button>
      )}
    </Link>
  );
}

const MapPin = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
