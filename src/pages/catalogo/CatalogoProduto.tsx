import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Sparkles, MessageCircle, Share2, ChevronLeft, ChevronRight, X, ZoomIn, Check, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCatalogoProdutoBySlug, useCatalogoTestemunhos, useCatalogoConfig } from "@/hooks/useCatalogo";
import { toast } from "sonner";

export default function CatalogoProdutoPage() {
  const { id } = useParams<{ id: string }>();
  const { data: produto, isLoading } = useCatalogoProdutoBySlug(id ?? null);
  const { data: config } = useCatalogoConfig();
  const { data: testemunhos } = useCatalogoTestemunhos(produto?.id);

  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

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
        headerElements: true,
        footerElements: true,
        ...raw.visibility
      }
    };
  }, [config]);

  const themeStyles = useMemo(() => `
    :root {
      --cat-primary: ${theme.primary};
      --cat-bg: ${theme.background};
      --cat-text: ${theme.text};
      --cat-button: ${theme.button};
      --cat-title-color: ${theme.colors.titles || theme.text};
      --cat-product-name-color: ${theme.colors.productName || theme.text};
      --cat-product-price-color: ${theme.colors.productPrice || theme.primary};
      --cat-category-text-color: ${theme.colors.categoryText || theme.text};
      --cat-border-color: ${theme.colors.borders || 'rgba(255,255,255,0.1)'};
    }
  `, [theme]);

  const whatsapp = config?.whatsapp_numero || "";

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Build image gallery
  const images = (() => {
    const imgs: { url: string; alt: string }[] = [];
    if (produto?.produto_imagens && (produto.produto_imagens as any[]).length > 0) {
      const sorted = [...(produto.produto_imagens as any[])].sort((a, b) => {
        if (a.principal && !b.principal) return -1;
        if (!a.principal && b.principal) return 1;
        return a.ordem - b.ordem;
      });
      sorted.forEach((img) => imgs.push({ url: img.url, alt: img.alt || produto.nome }));
    }
    if (imgs.length === 0 && produto?.imagem_url) {
      imgs.push({ url: produto.imagem_url, alt: produto.nome });
    }
    return imgs;
  })();

  const beneficios = Array.isArray((produto as any)?.beneficios) ? ((produto as any).beneficios as string[]) : [];
  const diferenciais = Array.isArray((produto as any)?.diferenciais) ? ((produto as any).diferenciais as string[]) : [];
  const modoUso = (produto as any)?.modo_uso || "";
  const observacoes = (produto as any)?.observacoes || "";

  // SEO
  useEffect(() => {
    if (produto) {
      document.title = (produto as any).seo_titulo || produto.nome;
      const metaDesc = document.querySelector('meta[name="description"]');
      const desc = (produto as any).seo_descricao || produto.descricao;
      if (metaDesc) metaDesc.setAttribute("content", desc || "");
    }
    return () => { document.title = "Catálogo"; };
  }, [produto]);

  const shareProduct = () => {
    const url = window.location.href;
    const text = `Confira ${produto?.nome} — ${fmt(Number(produto?.preco))}`;
    if (navigator.share) {
      navigator.share({ title: produto?.nome, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const shareWhatsApp = () => {
    const url = window.location.href;
    const text = encodeURIComponent(
      `Olá! Tenho interesse no produto: *${produto?.nome}* — ${fmt(Number(produto?.preco))}\n${url}`
    );
    window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cat-bg)" }}>
        <style>{themeStyles}</style>
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${theme.primary}30`, borderTopColor: theme.primary }} />
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: theme.background }}>
        <p style={{ color: "var(--cat-text)", opacity: 0.6 }}>Produto não encontrado</p>
        <Link to="/catalogo"><Button variant="outline">Voltar ao catálogo</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--cat-bg)", fontFamily: theme.typography }}>
      <style>{themeStyles}</style>
      
      {/* Nav */}
      <nav className="px-4 md:px-6 py-4" style={{ borderBottom: "1px solid var(--cat-border-color)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-80" style={{ color: "var(--cat-text)", opacity: 0.6 }}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <Button variant="ghost" size="icon" onClick={shareProduct}>
            <Share2 className="w-4 h-4" style={{ color: "var(--cat-text)", opacity: 0.6 }} />
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Image Gallery */}
          <div className="space-y-3">
            {/* Main image */}
            <div
              className="relative aspect-square rounded-2xl overflow-hidden cursor-zoom-in"
              style={{ backgroundColor: "var(--cat-border-color)" }}
              onClick={() => images.length > 0 && setZoomOpen(true)}
            >
              {images.length > 0 ? (
                <>
                  <img
                    src={images[selectedImage]?.url}
                    alt={images[selectedImage]?.alt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <ZoomIn className="w-4 h-4 text-white" />
                  </div>
                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                        onClick={(e) => { e.stopPropagation(); setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1)); }}
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                        onClick={(e) => { e.stopPropagation(); setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1)); }}
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Sparkles className="w-20 h-20" style={{ color: `${theme.primary}20` }} />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 transition-all ${
                      selectedImage === i ? "ring-2 opacity-100" : "opacity-50 hover:opacity-80"
                    }`}
                    style={selectedImage === i ? { outlineColor: theme.primary, boxShadow: `0 0 0 2px ${theme.primary}` } : undefined}
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-5 flex flex-col justify-center">
            {theme.visibility.productBadges && (
              <div className="flex items-center gap-2 flex-wrap">
                {(produto as any).categorias?.nome && (
                  <Badge style={{ backgroundColor: "var(--cat-border-color)", color: "var(--cat-text)" }}>{(produto as any).categorias.nome}</Badge>
                )}
                {(produto as any).promocao && (
                  <Badge style={{ backgroundColor: "#ef4444", color: "#fff" }}>PROMOÇÃO</Badge>
                )}
                {(produto as any).lancamento && (
                  <Badge style={{ backgroundColor: "var(--cat-primary)", color: "var(--cat-bg)" }}>LANÇAMENTO</Badge>
                )}
                {(produto as any).mais_vendido && (
                  <Badge style={{ backgroundColor: "#f59e0b", color: "#111" }}>MAIS VENDIDO</Badge>
                )}
              </div>
            )}

            {theme.visibility.productTitle && (
              <h1 className={`font-bold tracking-tight ${theme.sizes.productName || "text-2xl md:text-4xl"}`} style={{ color: "var(--cat-product-name-color)" }}>
                {produto.nome}
              </h1>
            )}

            {theme.visibility.productPrice && (
              <p className={`font-bold ${theme.sizes.productPrice || "text-3xl"}`} style={{ color: "var(--cat-product-price-color)" }}>
                {fmt(Number(produto.preco))}
              </p>
            )}

            {theme.visibility.productDescription && produto.descricao && (
              <p className="leading-relaxed opacity-70" style={{ color: "var(--cat-text)" }}>{produto.descricao}</p>
            )}

            {/* Benefits */}
            {beneficios.length > 0 && (
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-[var(--cat-border-color)]">
                <p className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--cat-primary)" }}>Benefícios</p>
                <ul className="space-y-2">
                  {beneficios.map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm opacity-80" style={{ color: "var(--cat-text)" }}>
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--cat-primary)" }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Use Mode */}
            {modoUso && (
              <div className="space-y-3">
                <p className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--cat-primary)" }}>Como Usar</p>
                <div className="text-sm leading-relaxed p-4 rounded-2xl bg-white/5 border border-[var(--cat-border-color)] whitespace-pre-line opacity-80" style={{ color: "var(--cat-text)" }}>
                  {modoUso}
                </div>
              </div>
            )}

            {/* Differentials */}
            {diferenciais.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--cat-primary)" }}>Diferenciais</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {diferenciais.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[var(--cat-border-color)]">
                      <Award className="w-5 h-5 opacity-50" style={{ color: "var(--cat-primary)" }} />
                      <span className="text-sm font-medium opacity-80" style={{ color: "var(--cat-text)" }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observations */}
            {observacoes && (
              <div className="p-4 rounded-xl border border-dashed border-[var(--cat-border-color)] bg-white/5">
                <p className="text-[10px] font-bold uppercase opacity-40 mb-1" style={{ color: "var(--cat-text)" }}>Observações</p>
                <p className="text-xs italic opacity-60" style={{ color: "var(--cat-text)" }}>{observacoes}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm opacity-50" style={{ color: "var(--cat-text)" }}>
              {produto.codigo && <span>Cód: {produto.codigo}</span>}
              <span>Unidade: {produto.unidade}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {whatsapp && (
                <Button
                  size="lg"
                  className="rounded-full gap-2 flex-1 text-base shadow-xl"
                  style={{ backgroundColor: "#25d366", color: "#fff" }}
                  onClick={shareWhatsApp}
                >
                  <MessageCircle className="w-5 h-5" /> Comprar via WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="rounded-full gap-2 border-[var(--cat-border-color)]"
                style={{ color: "var(--cat-text)" }}
                onClick={shareProduct}
              >
                <Share2 className="w-4 h-4" /> Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Dynamic Sections */}
        <div className="space-y-12 py-10">
          {((config as any)?.secoes_produto as any[] || [
              { id: "benefits", active: true },
              { id: "use_mode", active: true },
              { id: "differentials", active: true },
              { id: "testimonials", active: true },
              { id: "observations", active: true },
            ]).filter(s => s.active).map((section) => {
              switch (section.id) {
                case "benefits":
                  if (beneficios.length === 0) return null;
                  return (
                    <div key="benefits" className="space-y-3 p-8 rounded-[2rem] bg-white/5 border border-[var(--cat-border-color)]">
                      <p className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--cat-primary)" }}>Benefícios</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {beneficios.map((b, i) => (
                          <li key={i} className="flex items-start gap-3 text-base opacity-80" style={{ color: "var(--cat-text)" }}>
                            <Check className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--cat-primary)" }} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                case "use_mode":
                  if (!modoUso) return null;
                  return (
                    <div key="use_mode" className="space-y-4">
                      <p className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--cat-primary)" }}>Como Usar</p>
                      <div className="text-lg leading-relaxed p-8 rounded-[2rem] bg-white/5 border border-[var(--cat-border-color)] whitespace-pre-line opacity-80" style={{ color: "var(--cat-text)" }}>
                        {modoUso}
                      </div>
                    </div>
                  );
                case "differentials":
                  if (diferenciais.length === 0) return null;
                  return (
                    <div key="differentials" className="space-y-4">
                      <p className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--cat-primary)" }}>Diferenciais</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {diferenciais.map((d, i) => (
                          <div key={i} className="flex flex-col gap-3 p-6 rounded-2xl bg-white/5 border border-[var(--cat-border-color)] hover:bg-white/10 transition-colors">
                            <Award className="w-8 h-8 opacity-50" style={{ color: "var(--cat-primary)" }} />
                            <span className="text-base font-bold opacity-90" style={{ color: "var(--cat-text)" }}>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                case "observations":
                  if (!observacoes) return null;
                  return (
                    <div key="observations" className="p-6 rounded-2xl border border-dashed border-[var(--cat-border-color)] bg-white/5">
                      <p className="text-[10px] font-bold uppercase opacity-40 mb-2" style={{ color: "var(--cat-text)" }}>Observações Importantes</p>
                      <p className="text-sm italic opacity-60" style={{ color: "var(--cat-text)" }}>{observacoes}</p>
                    </div>
                  );
                case "testimonials":
                  if (!testemunhos || testemunhos.length === 0) return null;
                  return (
                    <div key="testimonials" className="space-y-8 py-10">
                      <h2 className="text-3xl font-bold text-center" style={{ color: "var(--cat-text)" }}>Experiências Reais</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {testemunhos.map((t) => (
                          <div key={t.id} className="p-8 rounded-[2rem] space-y-4 bg-white/5 border border-[var(--cat-border-color)] hover:border-white/20 transition-all">
                            <div className="flex gap-1">
                              {[...Array(t.nota)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 fill-current" style={{ color: "var(--cat-primary)" }} />
                              ))}
                            </div>
                            <p className="text-lg italic opacity-90" style={{ color: "var(--cat-text)" }}>"{t.texto}"</p>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-white/10" style={{ color: "var(--cat-primary)" }}>
                                 {t.nome_cliente.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-sm font-bold opacity-60" style={{ color: "var(--cat-text)" }}>{t.nome_cliente}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.9)" }}>
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20"
            onClick={() => setZoomOpen(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20"
                onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20"
                onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          <img
            src={images[selectedImage]?.url}
            alt={images[selectedImage]?.alt}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
          <div className="absolute bottom-4 text-white text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}

      {/* Mobile sticky CTA */}
      {whatsapp && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 safe-area-bottom backdrop-blur-lg" style={{ backgroundColor: "var(--cat-bg)", borderTop: "1px solid var(--cat-border-color)" }}>
          <Button
            className="w-full h-12 rounded-full gap-2 text-base shadow-lg"
            style={{ backgroundColor: "#25d366", color: "#fff" }}
            onClick={shareWhatsApp}
          >
            <MessageCircle className="w-5 h-5" /> Comprar via WhatsApp
          </Button>
        </div>
      )}

      {/* Footer */}
      {theme.visibility.footerElements && (
        <footer className="text-center py-8 px-6" style={{ borderTop: "1px solid var(--cat-border-color)" }}>
          <p className="text-sm opacity-40" style={{ color: "var(--cat-text)" }}>
            © {new Date().getFullYear()} — Catálogo Online
          </p>
        </footer>
      )}
    </div>
  );
}
