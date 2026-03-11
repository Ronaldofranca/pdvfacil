import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Sparkles, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCatalogoProduto, useCatalogoTestemunhos } from "@/hooks/useCatalogo";

export default function CatalogoProdutoPage() {
  const { id } = useParams<{ id: string }>();
  const { data: produto, isLoading } = useCatalogoProduto(id ?? null);
  const { data: testemunhos } = useCatalogoTestemunhos();

  const prodTestemunhos = testemunhos?.filter((t) => t.produto_id === id);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Produto não encontrado</p>
        <Link to="/catalogo"><Button variant="outline">Voltar ao catálogo</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="px-6 py-4 border-b">
        <Link to="/catalogo" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Image */}
          <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-muted to-muted/50">
            {produto.imagem_url ? (
              <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-20 h-20 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6 flex flex-col justify-center">
            {(produto as any).categorias?.nome && (
              <Badge variant="secondary" className="w-fit">{(produto as any).categorias.nome}</Badge>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{produto.nome}</h1>
            <p className="text-3xl font-bold text-primary">{fmt(Number(produto.preco))}</p>

            {produto.descricao && (
              <p className="text-muted-foreground leading-relaxed">{produto.descricao}</p>
            )}

            <div className="flex gap-4 text-sm text-muted-foreground">
              {produto.codigo && <span>Cód: {produto.codigo}</span>}
              <span>Unidade: {produto.unidade}</span>
            </div>

            <Button size="lg" className="rounded-full gap-2 w-full md:w-auto">
              <ShoppingBag className="w-4 h-4" /> Solicitar orçamento
            </Button>
          </div>
        </div>

        {/* Testemunhos do produto */}
        {prodTestemunhos && prodTestemunhos.length > 0 && (
          <>
            <Separator className="my-12" />
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">O que dizem sobre este produto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prodTestemunhos.map((t) => (
                  <div key={t.id} className="p-6 rounded-2xl bg-muted/50 border space-y-3">
                    <div className="flex gap-1">
                      {[...Array(t.nota)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground italic">"{t.texto}"</p>
                    <p className="text-sm text-muted-foreground font-medium">— {t.nome_cliente}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
