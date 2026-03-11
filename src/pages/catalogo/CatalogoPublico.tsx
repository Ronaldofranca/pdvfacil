import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Sparkles, ArrowRight, ChevronRight, MessageCircle, Award, Heart, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCatalogoProdutos, useCatalogoCategorias, useCatalogoTestemunhos, useCatalogoConfig } from "@/hooks/useCatalogo";

export default function CatalogoPublicoPage() {
  const { data: config } = useCatalogoConfig();
  const { data: allProdutos, isLoading } = useCatalogoProdutos();
  const { data: destaques } = useCatalogoProdutos({ destaque: true });
  const { data: categorias } = useCatalogoCategorias();
  const { data: testemunhos } = useCatalogoTestemunhos();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = useMemo(
    () =>
      allProdutos
        ?.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()))
        .filter((p) => !catFilter || p.categoria_id === catFilter),
    [allProdutos, search, catFilter]
  );

  const primaryColor = config?.cor_primaria || "#10b981";
  const bgColor = config?.cor_fundo || "#0f1117";
  const btnColor = config?.cor_botoes || "#10b981";
  const font = config?.tipografia || "Inter";
  const cardStyle = config?.estilo_cards || "rounded";
  const beneficios = Array.isArray(config?.beneficios) ? (config.beneficios as any[]) : [];

  const cardRadius = cardStyle === "sharp" ? "rounded-lg" : cardStyle === "minimal" ? "rounded-xl" : cardStyle === "shadow" ? "rounded-2xl shadow-lg" : "rounded-2xl";

  const getProductUrl = (p: any) => {
    const slug = p.slug && p.slug.length > 0 ? p.slug : p.id;
    return `/catalogo/${slug}`;
  };

  const getMainImage = (p: any) => {
    const imgs = p.produto_imagens;
    if (imgs && imgs.length > 0) {
      const principal = imgs.find((i: any) => i.principal);
      return principal?.url || imgs[0]?.url;
    }
    return p.imagem_url;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily: font }}>
      {/* Hero Banner */}
      <section className="relative overflow-hidden">
        {config?.banner_url ? (
          <div className="relative h-[50vh] md:h-[60vh]">
            <img src={config.banner_url} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16 max-w-5xl mx-auto">
              {config?.subtitulo && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: primaryColor, color: bgColor }}>
                  {config.subtitulo}
                </span>
              )}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3">
                {config?.titulo || "Nosso Catálogo"}
              </h1>
              {config?.descricao && (
                <p className="text-base md:text-lg text-white/80 max-w-2xl">{config.descricao}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-16 md:py-24 px-6">
            <div className="relative max-w-4xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, border: `1px solid ${primaryColor}30` }}>
                <Sparkles className="w-4 h-4" />
                {config?.subtitulo || "Catálogo Premium"}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight" style={{ color: "#f8fafc" }}>
                {config?.titulo || "Beleza que "}
                <span style={{ color: primaryColor }}>transforma</span>
              </h1>
              {config?.descricao && (
                <p className="text-lg max-w-2xl mx-auto" style={{ color: "#94a3b8" }}>{config.descricao}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Search */}
      <section className="px-6 py-8">
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
          <Input
            className="pl-11 h-12 rounded-full shadow-sm border-0"
            style={{ backgroundColor: "#1e293b", color: "#f8fafc" }}
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* Featured Products */}
      {config?.secao_destaque !== false && destaques && destaques.length > 0 && !search && (
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: "#f8fafc" }}>✨ Em Destaque</h2>
              <Link to="/catalogo/produtos" className="text-sm font-medium flex items-center gap-1" style={{ color: primaryColor }}>
                Ver todos <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {destaques.slice(0, 4).map((p) => (
                <Link key={p.id} to={getProductUrl(p)} className="group block">
                  <div className={`relative aspect-[3/4] ${cardRadius} overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 mb-3`}>
                    {getMainImage(p) ? (
                      <img src={getMainImage(p)} alt={p.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-12 h-12" style={{ color: `${primaryColor}30` }} />
                      </div>
                    )}
                    {(p as any).promocao && (
                      <Badge className="absolute top-3 left-3 text-[10px]" style={{ backgroundColor: "#ef4444", color: "#fff" }}>PROMOÇÃO</Badge>
                    )}
                    {(p as any).lancamento && (
                      <Badge className="absolute top-3 right-3 text-[10px]" style={{ backgroundColor: primaryColor, color: bgColor }}>NOVO</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm group-hover:opacity-80 transition-opacity" style={{ color: "#f8fafc" }}>{p.nome}</h3>
                  <p className="text-lg font-bold mt-1" style={{ color: primaryColor }}>{fmt(Number(p.preco))}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {config?.secao_categorias !== false && categorias && categorias.length > 0 && (
        <section className="px-6 pb-8">
          <div className="max-w-6xl mx-auto flex gap-2 flex-wrap justify-center">
            <button
              onClick={() => setCatFilter(null)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: !catFilter ? primaryColor : "#1e293b",
                color: !catFilter ? bgColor : "#94a3b8",
              }}
            >
              Todos
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatFilter(c.id === catFilter ? null : c.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: catFilter === c.id ? primaryColor : "#1e293b",
                  color: catFilter === c.id ? bgColor : "#94a3b8",
                }}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`aspect-[3/4] ${cardRadius} animate-pulse`} style={{ backgroundColor: "#1e293b" }} />
              ))}
            </div>
          ) : !filtered?.length ? (
            <p className="text-center py-20" style={{ color: "#94a3b8" }}>Nenhum produto encontrado</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => (
                <Link key={p.id} to={getProductUrl(p)} className="group block">
                  <div className={`relative aspect-[3/4] ${cardRadius} overflow-hidden mb-3`} style={{ backgroundColor: "#1e293b" }}>
                    {getMainImage(p) ? (
                      <img src={getMainImage(p)} alt={p.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-12 h-12" style={{ color: `${primaryColor}30` }} />
                      </div>
                    )}
                    {(p as any).categorias?.nome && (
                      <Badge className="absolute top-3 left-3 text-[10px]" style={{ backgroundColor: "rgba(255,255,255,0.85)", color: "#111" }}>
                        {(p as any).categorias.nome}
                      </Badge>
                    )}
                    {(p as any).promocao && (
                      <Badge className="absolute top-3 right-3 text-[10px]" style={{ backgroundColor: "#ef4444", color: "#fff" }}>PROMO</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm group-hover:opacity-80 transition-opacity" style={{ color: "#f8fafc" }}>{p.nome}</h3>
                  <p className="text-lg font-bold mt-0.5" style={{ color: primaryColor }}>{fmt(Number(p.preco))}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      {config?.secao_beneficios !== false && beneficios.length > 0 && (
        <section className="px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ color: "#f8fafc" }}>Por que nos escolher?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {beneficios.map((b, i) => (
                <div key={i} className={`${cardRadius} p-6 text-center space-y-3`} style={{ backgroundColor: "#1e293b" }}>
                  <span className="text-3xl">{b.icone}</span>
                  <h3 className="font-bold" style={{ color: "#f8fafc" }}>{b.titulo}</h3>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{b.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {config?.secao_testemunhos !== false && testemunhos && testemunhos.length > 0 && (
        <section className="px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ color: "#f8fafc" }}>O que dizem nossos clientes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testemunhos.slice(0, 6).map((t) => (
                <div key={t.id} className={`${cardRadius} p-6 space-y-3`} style={{ backgroundColor: "#1e293b" }}>
                  <div className="flex gap-1">
                    {[...Array(t.nota)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" style={{ color: primaryColor }} />
                    ))}
                  </div>
                  <p className="italic" style={{ color: "#e2e8f0" }}>"{t.texto}"</p>
                  <div className="flex items-center gap-3">
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt={t.nome_cliente} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                        {t.nome_cliente.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#f8fafc" }}>{t.nome_cliente}</p>
                      {(t as any).produtos?.nome && (
                        <p className="text-xs" style={{ color: primaryColor }}>{(t as any).produtos.nome}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {testemunhos.length > 6 && (
              <div className="text-center mt-6">
                <Link to="/catalogo/testemunhos">
                  <Button variant="outline" className="rounded-full gap-2">
                    Ver todos os depoimentos <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      {config?.secao_cta !== false && config?.cta_titulo && (
        <section className="px-6 pb-16">
          <div className="max-w-3xl mx-auto text-center p-10 md:p-16" style={{
            background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08)`,
            border: `1px solid ${primaryColor}20`,
            borderRadius: "24px",
          }}>
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "#f8fafc" }}>{config.cta_titulo}</h2>
            {config.cta_descricao && (
              <p className="mb-6" style={{ color: "#94a3b8" }}>{config.cta_descricao}</p>
            )}
            {config.cta_botao_link && (
              <a href={config.cta_botao_link} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="rounded-full gap-2 text-base px-8" style={{ backgroundColor: btnColor, color: bgColor }}>
                  <MessageCircle className="w-5 h-5" />
                  {config.cta_botao_texto || "Fale Conosco"}
                </Button>
              </a>
            )}
          </div>
        </section>
      )}

      {/* WhatsApp Float */}
      {config?.whatsapp_numero && (
        <a
          href={`https://wa.me/${config.whatsapp_numero}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          style={{ backgroundColor: "#25d366" }}
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </a>
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
