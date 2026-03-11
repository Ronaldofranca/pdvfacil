import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Sparkles, MessageCircle, Share2, ChevronLeft, ChevronRight, X, ZoomIn, Check } from "lucide-react";
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

  const primaryColor = config?.cor_primaria || "#10b981";
  const bgColor = config?.cor_fundo || "#0f1117";
  const btnColor = config?.cor_botoes || "#10b981";
  const font = config?.tipografia || "Inter";
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${primaryColor}30`, borderTopColor: primaryColor }} />
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: bgColor }}>
        <p style={{ color: "#94a3b8" }}>Produto não encontrado</p>
        <Link to="/catalogo"><Button variant="outline">Voltar ao catálogo</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily: font }}>
      {/* Nav */}
      <nav className="px-4 md:px-6 py-4" style={{ borderBottom: "1px solid #1e293b" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-80" style={{ color: "#94a3b8" }}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <Button variant="ghost" size="icon" onClick={shareProduct}>
            <Share2 className="w-4 h-4" style={{ color: "#94a3b8" }} />
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Image Gallery */}
          <div className="space-y-3">
            {/* Main image */}
            <div
              className="relative aspect-square rounded-2xl overflow-hidden cursor-zoom-in"
              style={{ backgroundColor: "#1e293b" }}
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
                  <Sparkles className="w-20 h-20" style={{ color: `${primaryColor}20` }} />
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
                    style={selectedImage === i ? { outlineColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}` } : undefined}
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              {(produto as any).categorias?.nome && (
                <Badge style={{ backgroundColor: "#1e293b", color: "#94a3b8" }}>{(produto as any).categorias.nome}</Badge>
              )}
              {(produto as any).promocao && (
                <Badge style={{ backgroundColor: "#ef4444", color: "#fff" }}>PROMOÇÃO</Badge>
              )}
              {(produto as any).lancamento && (
                <Badge style={{ backgroundColor: primaryColor, color: bgColor }}>LANÇAMENTO</Badge>
              )}
              {(produto as any).mais_vendido && (
                <Badge style={{ backgroundColor: "#f59e0b", color: "#111" }}>MAIS VENDIDO</Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-bold tracking-tight" style={{ color: "#f8fafc" }}>
              {produto.nome}
            </h1>

            <p className="text-3xl font-bold" style={{ color: primaryColor }}>
              {fmt(Number(produto.preco))}
            </p>

            {produto.descricao && (
              <p className="leading-relaxed" style={{ color: "#94a3b8" }}>{produto.descricao}</p>
            )}

            {/* Benefits */}
            {beneficios.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: "#f8fafc" }}>Benefícios</p>
                <ul className="space-y-1.5">
                  {beneficios.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#cbd5e1" }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm" style={{ color: "#64748b" }}>
              {produto.codigo && <span>Cód: {produto.codigo}</span>}
              <span>Unidade: {produto.unidade}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {whatsapp && (
                <Button
                  size="lg"
                  className="rounded-full gap-2 flex-1 text-base"
                  style={{ backgroundColor: "#25d366", color: "#fff" }}
                  onClick={shareWhatsApp}
                >
                  <MessageCircle className="w-5 h-5" /> Comprar via WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="rounded-full gap-2"
                onClick={shareProduct}
              >
                <Share2 className="w-4 h-4" /> Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Product Testimonials */}
        {testemunhos && testemunhos.length > 0 && (
          <>
            <Separator className="my-10" style={{ backgroundColor: "#1e293b" }} />
            <div className="space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: "#f8fafc" }}>O que dizem sobre este produto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {testemunhos.map((t) => (
                  <div key={t.id} className="p-6 rounded-2xl space-y-3" style={{ backgroundColor: "#1e293b" }}>
                    <div className="flex gap-1">
                      {[...Array(t.nota)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" style={{ color: primaryColor }} />
                      ))}
                    </div>
                    <p className="italic" style={{ color: "#e2e8f0" }}>"{t.texto}"</p>
                    <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>— {t.nome_cliente}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 safe-area-bottom" style={{ backgroundColor: bgColor, borderTop: "1px solid #1e293b" }}>
          <Button
            className="w-full h-12 rounded-full gap-2 text-base"
            style={{ backgroundColor: "#25d366", color: "#fff" }}
            onClick={shareWhatsApp}
          >
            <MessageCircle className="w-5 h-5" /> Comprar via WhatsApp
          </Button>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 px-6" style={{ borderTop: "1px solid #1e293b" }}>
        <p className="text-sm" style={{ color: "#64748b" }}>
          © {new Date().getFullYear()} — Catálogo Online
        </p>
      </footer>
    </div>
  );
}
