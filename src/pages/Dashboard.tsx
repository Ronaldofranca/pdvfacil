import {
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CreditCard,
  PackageX,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData();

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const kpis = [
    { label: "Vendas do Dia", value: data ? `${data.qtdVendasDia} vendas` : "—", sub: data ? fmt(data.totalVendasDia) : "", icon: ShoppingCart, color: "text-primary" },
    { label: "Lucro do Dia", value: data ? fmt(data.lucroDia) : "—", icon: TrendingUp, color: "text-primary" },
    { label: "Parcelas Vencidas", value: data ? `${data.qtdVencidas}` : "—", sub: data ? fmt(data.totalVencido) : "", icon: AlertTriangle, color: "text-destructive" },
    { label: "Contas a Receber", value: data ? fmt(data.totalAReceber) : "—", icon: CreditCard, color: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do negócio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{isLoading ? "..." : kpi.value}</p>
              {kpi.sub && <p className="text-sm font-semibold text-muted-foreground">{kpi.sub}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendas Recentes */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Vendas Recentes
            </h2>
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
              ) : !data?.vendasRecentes.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma venda hoje</p>
              ) : (
                data.vendasRecentes.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.clientes?.nome ?? "Cliente avulso"}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{fmt(Number(v.total))}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estoque Baixo */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <PackageX className="w-4 h-4 text-destructive" /> Estoque Baixo
            </h2>
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
              ) : !data?.estoqueBaixo.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum produto com estoque baixo 🎉</p>
              ) : (
                data.estoqueBaixo.slice(0, 8).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <p className="text-sm font-medium text-foreground">{e.produtos?.nome}</p>
                    <Badge variant={Number(e.quantidade) <= 0 ? "destructive" : "secondary"}>
                      {Number(e.quantidade)} {e.produtos?.unidade ?? "un"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
