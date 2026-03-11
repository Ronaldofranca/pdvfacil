import { Link } from "react-router-dom";
import {
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CreditCard,
  PackageX,
  TrendingUp,
  Target,
  BellRing,
  MapPin,
  PackageSearch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDashboardData } from "@/hooks/useDashboard";
import { useVendedorDashboard } from "@/hooks/useMetasComissoes";
import { useAlertasInteligentes } from "@/hooks/useAlertasInteligentes";
import { usePrevisaoEstoque } from "@/hooks/usePrevisaoEstoque";

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData();
  const { data: vendedorDash } = useVendedorDashboard();
  const { data: alertas } = useAlertasInteligentes();
  const { data: previsoes } = usePrevisaoEstoque();

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const alertasAltos = (alertas || []).filter((a) => a.prioridade === "alta").length;
  const estoqueCritico = (previsoes || []).filter((p) => p.urgencia === "critico").length;

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

      {/* Meta do vendedor + Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta Progress */}
        {vendedorDash && vendedorDash.metaValor > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Minha Meta
                </h2>
                <Link to="/metas">
                  <Badge variant="outline" className="text-[10px] cursor-pointer">Ver tudo</Badge>
                </Link>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{fmt(vendedorDash.totalMes)}</span>
                  <span className="font-semibold text-foreground">{vendedorDash.percentualMeta}%</span>
                </div>
                <Progress value={Math.min(vendedorDash.percentualMeta, 100)} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Meta: {fmt(vendedorDash.metaValor)}</span>
                  <span>Comissão: {fmt(vendedorDash.comissaoAcumulada)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Alerts */}
        {(alertasAltos > 0 || estoqueCritico > 0) && (
          <Card className="border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-destructive" /> Atenção
                </h2>
                <Link to="/alertas">
                  <Badge variant="destructive" className="text-[10px] cursor-pointer">{alertasAltos} alertas</Badge>
                </Link>
              </div>
              <div className="space-y-2">
                {alertasAltos > 0 && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {alertasAltos} alerta(s) de alta prioridade
                  </p>
                )}
                {estoqueCritico > 0 && (
                  <Link to="/previsao-estoque" className="text-sm text-destructive flex items-center gap-2 hover:underline">
                    <PackageSearch className="w-3.5 h-3.5" />
                    {estoqueCritico} produto(s) com estoque crítico
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Mapa", icon: MapPin, path: "/mapa-clientes", color: "text-primary" },
          { label: "Metas", icon: Target, path: "/metas", color: "text-primary" },
          { label: "Previsão", icon: PackageSearch, path: "/previsao-estoque", color: "text-primary" },
          { label: "Alertas", icon: BellRing, path: "/alertas", color: alertasAltos > 0 ? "text-destructive" : "text-primary" },
        ].map((item) => (
          <Link key={item.path} to={item.path}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-3 text-center">
                <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
                <p className="text-[11px] font-medium text-foreground">{item.label}</p>
              </CardContent>
            </Card>
          </Link>
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
