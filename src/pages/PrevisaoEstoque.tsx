import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PackageSearch, AlertTriangle, TrendingDown, ArrowUp } from "lucide-react";
import { usePrevisaoEstoque } from "@/hooks/usePrevisaoEstoque";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function PrevisaoEstoquePage() {
  const { data: previsoes, isLoading } = usePrevisaoEstoque();

  const criticos = (previsoes || []).filter((p) => p.urgencia === "critico");
  const baixos = (previsoes || []).filter((p) => p.urgencia === "baixo");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <PackageSearch className="w-5 h-5 text-primary" /> Previsão de Estoque
        </h1>
        <p className="text-sm text-muted-foreground">Sugestões inteligentes de reposição</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-destructive/30">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-2xl font-bold text-destructive">{criticos.length}</p>
            <p className="text-[11px] text-muted-foreground">Críticos (≤7 dias)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{baixos.length}</p>
            <p className="text-[11px] text-muted-foreground">Estoque baixo (≤15 dias)</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de produtos */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Analisando vendas...</p>
        ) : (
          (previsoes || [])
            .filter((p) => p.urgencia !== "ok" || p.sugestaoReposicao > 0)
            .slice(0, 50)
            .map((p) => (
              <Card key={p.produtoId} className={p.urgencia === "critico" ? "border-destructive/40" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm truncate">{p.produtoNome}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={p.urgencia === "critico" ? "destructive" : p.urgencia === "baixo" ? "secondary" : "outline"} className="text-[10px]">
                          {p.urgencia === "critico" ? "CRÍTICO" : p.urgencia === "baixo" ? "BAIXO" : "OK"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Estoque: {p.estoqueAtual} {p.unidade}
                        </span>
                      </div>
                    </div>
                    {p.sugestaoReposicao > 0 && (
                      <div className="bg-primary/10 rounded-lg px-3 py-1.5 text-center shrink-0">
                        <ArrowUp className="w-3 h-3 text-primary mx-auto" />
                        <p className="text-sm font-bold text-primary">+{p.sugestaoReposicao}</p>
                        <p className="text-[9px] text-muted-foreground">{p.unidade}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <span className="block font-medium text-foreground">{p.vendas30d}</span>
                      Vendas 30d
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">{p.mediadiaria}/dia</span>
                      Média
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">{p.diasEstoque > 900 ? "∞" : `${p.diasEstoque}d`}</span>
                      Duração
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
        {!isLoading && (previsoes || []).filter((p) => p.urgencia !== "ok" || p.sugestaoReposicao > 0).length === 0 && (
          <p className="text-center text-muted-foreground py-8">Todos os produtos estão com estoque adequado 🎉</p>
        )}
      </div>
    </div>
  );
}
