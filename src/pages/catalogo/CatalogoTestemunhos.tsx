import { Link } from "react-router-dom";
import { ArrowLeft, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCatalogoTestemunhos, useCatalogoConfig } from "@/hooks/useCatalogo";

export default function CatalogoTestemunhosPage() {
  const { data: testemunhos, isLoading } = useCatalogoTestemunhos();
  const { data: config } = useCatalogoConfig();

  const primaryColor = config?.cor_primaria || "#10b981";
  const bgColor = config?.cor_fundo || "#0f1117";
  const font = config?.tipografia || "Inter";

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily: font }}>
      <nav className="px-6 py-4" style={{ borderBottom: "1px solid #1e293b" }}>
        <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-80" style={{ color: "#94a3b8" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#f8fafc" }}>Depoimentos</h1>
          <p className="max-w-xl mx-auto" style={{ color: "#94a3b8" }}>
            Veja o que nossos clientes dizem sobre nossos produtos. Resultados reais, pessoas reais.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ backgroundColor: "#1e293b" }} />
            ))}
          </div>
        ) : !testemunhos?.length ? (
          <p className="text-center py-20" style={{ color: "#94a3b8" }}>Nenhum depoimento ainda</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testemunhos.map((t) => (
              <div
                key={t.id}
                className="relative p-6 rounded-2xl space-y-4 group hover:shadow-md transition-shadow"
                style={{ backgroundColor: "#1e293b" }}
              >
                <Quote className="absolute top-4 right-4 w-8 h-8" style={{ color: `${primaryColor}15` }} />
                <div className="flex gap-1">
                  {[...Array(t.nota)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: primaryColor }} />
                  ))}
                  {[...Array(5 - t.nota)].map((_, i) => (
                    <Star key={i} className="w-4 h-4" style={{ color: "#334155" }} />
                  ))}
                </div>
                <p className="leading-relaxed" style={{ color: "#e2e8f0" }}>"{t.texto}"</p>
                <div className="flex items-center gap-3">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.nome_cliente} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
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
        )}
      </div>

      <footer className="text-center py-8 px-6" style={{ borderTop: "1px solid #1e293b" }}>
        <p className="text-sm" style={{ color: "#64748b" }}>
          © {new Date().getFullYear()} — Catálogo Online
        </p>
      </footer>
    </div>
  );
}
