import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Sparkles, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCatalogoProdutos, useCatalogoCategorias, useCatalogoTestemunhos } from "@/hooks/useCatalogo";

export default function CatalogoPage() {
  const { data: produtos, isLoading } = useCatalogoProdutos();
  const { data: categorias } = useCatalogoCategorias();
  const { data: testemunhos } = useCatalogoTestemunhos();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = produtos
    ?.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !catFilter || p.categoria_id === catFilter);

  const featuredTestimonial = testemunhos?.[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Catálogo Premium
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight leading-tight">
            Beleza que
            <span className="text-primary"> transforma</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra nossa linha exclusiva de produtos profissionais para cabelos. Qualidade premium para resultados extraordinários.
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-11 h-12 rounded-full border-primary/20 bg-card shadow-sm"
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      {categorias && categorias.length > 0 && (
        <section className="px-6 pb-8">
          <div className="max-w-6xl mx-auto flex gap-2 flex-wrap justify-center">
            <button
              onClick={() => setCatFilter(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !catFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              Todos
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatFilter(c.id === catFilter ? null : c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  catFilter === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
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
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !filtered?.length ? (
            <p className="text-center text-muted-foreground py-20">Nenhum produto encontrado</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to={`/catalogo/${p.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 mb-3">
                    {p.imagem_url ? (
                      <img
                        src={p.imagem_url}
                        alt={p.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {(p as any).categorias?.nome && (
                      <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground text-xs">
                        {(p as any).categorias.nome}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.nome}</h3>
                  <p className="text-lg font-bold text-primary mt-1">{fmt(Number(p.preco))}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Testimonial */}
      {featuredTestimonial && (
        <section className="px-6 pb-16">
          <div className="max-w-3xl mx-auto text-center space-y-4 p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
            <div className="flex justify-center gap-1">
              {[...Array(featuredTestimonial.nota)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="text-lg md:text-xl text-foreground italic">
              "{featuredTestimonial.texto}"
            </blockquote>
            <p className="text-sm text-muted-foreground font-medium">
              — {featuredTestimonial.nome_cliente}
              {(featuredTestimonial as any).produtos?.nome && (
                <span className="text-primary"> · {(featuredTestimonial as any).produtos.nome}</span>
              )}
            </p>
          </div>
        </section>
      )}

      {/* CTA Testimonials */}
      <section className="px-6 pb-16 text-center">
        <Link to="/catalogo/testemunhos">
          <Button variant="outline" size="lg" className="rounded-full gap-2">
            Ver todos os depoimentos <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
