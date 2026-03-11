import { Link } from "react-router-dom";
import { ArrowLeft, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCatalogoTestemunhos } from "@/hooks/useCatalogo";

export default function CatalogoTestemunhosPage() {
  const { data: testemunhos, isLoading } = useCatalogoTestemunhos();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="px-6 py-4 border-b">
        <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Depoimentos</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Veja o que nossos clientes dizem sobre nossos produtos. Resultados reais, pessoas reais.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !testemunhos?.length ? (
          <p className="text-center text-muted-foreground py-20">Nenhum depoimento ainda</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testemunhos.map((t) => (
              <div
                key={t.id}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-card to-muted/30 border shadow-sm space-y-4 group hover:shadow-md transition-shadow"
              >
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
                <div className="flex gap-1">
                  {[...Array(t.nota)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                  {[...Array(5 - t.nota)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-muted-foreground/30" />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed">"{t.texto}"</p>
                <div className="flex items-center gap-3">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.nome_cliente} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {t.nome_cliente.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.nome_cliente}</p>
                    {(t as any).produtos?.nome && (
                      <p className="text-xs text-primary">{(t as any).produtos.nome}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
