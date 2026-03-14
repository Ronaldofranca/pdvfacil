import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, DollarSign, AlertTriangle, CreditCard, PackageX,
  TrendingUp, Target, BellRing, MapPin, PackageSearch, Users,
  FileDown, Calendar as CalendarIcon, UserCheck, BarChart3, Award, Star, MessageSquare, CalendarClock,
  ClipboardList, Truck, Eye, EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useDashboardData, useDashboardPeriodo, type DashboardPeriodo } from "@/hooks/useDashboard";
import { useVendedorDashboard } from "@/hooks/useMetasComissoes";
import { useAlertasInteligentes } from "@/hooks/useAlertasInteligentes";
import { usePrevisaoEstoque } from "@/hooks/usePrevisaoEstoque";
import { useLembretesContagem } from "@/hooks/useCobrancas";
import { useTopIndicadores } from "@/hooks/useIndicacoes";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAuth } from "@/contexts/AuthContext";
import { usePedidosDashboard } from "@/hooks/usePedidos";
import { exportPDF, fmtR } from "@/lib/reportExport";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(160, 60%, 45%)",
  "hsl(200, 70%, 50%)",
  "hsl(40, 80%, 55%)",
  "hsl(0, 70%, 55%)",
];

const PERIODOS: { value: DashboardPeriodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "7 dias" },
  { value: "30dias", label: "30 dias" },
  { value: "mes", label: "Mês" },
];

const MASKED = "R$ •••••";

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<DashboardPeriodo>("mes");
  const [showValues, setShowValues] = useState(true);
  const { isAdmin, isVendedor } = useAuth();

  const { data, isLoading } = useDashboardData();
  const { data: pd, isLoading: lPd } = useDashboardPeriodo(periodo);
  const { data: vendedorDash } = useVendedorDashboard();
  const { data: alertas } = useAlertasInteligentes();
  const { data: previsoes } = usePrevisaoEstoque();
  const { data: topIndicadores } = useTopIndicadores();
  const { data: empresas } = useEmpresas();
  const { data: lembretes } = useLembretesContagem();
  const { data: pedidosDash } = usePedidosDashboard();

  const alertasAltos = (alertas || []).filter((a) => a.prioridade === "alta").length;
  const estoqueCritico = (previsoes || []).filter((p) => p.urgencia === "critico").length;
  const empresaNome = empresas?.[0]?.nome ?? "VendaForce";

  const v = (val: string) => showValues ? val : MASKED;

  const handleExportPDF = () => {
    if (!data || !pd) return;
    const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label ?? "";
    exportPDF({
      title: "Resumo Executivo - Dashboard",
      periodo: periodoLabel,
      empresa: empresaNome,
      headers: ["Indicador", "Valor"],
      rows: [
        ["Vendas do Dia", `${data.qtdVendasDia} (${fmtR(data.totalVendasDia)})`],
        ["Lucro Estimado Hoje", fmtR(data.lucroDia)],
        ["Recebido Hoje", fmtR(data.recebidoHoje)],
        ["---", "---"],
        [`Vendas no Período (${periodoLabel})`, `${pd.qtdVendas} (${fmtR(pd.totalVendas)})`],
        ["Total Recebido (Período)", fmtR(pd.totalRecebido)],
        ["Lucro do Período", fmtR(pd.lucroPeriodo)],
        ["---", "---"],
        ["Contas a Receber", fmtR(data.totalAReceber)],
        ["Parcelas Vencidas", `${data.qtdVencidas} (${fmtR(data.totalVencido)})`],
        ["Produtos com Estoque Baixo", String(data.estoqueBaixo.length)],
        ["Produtos Sem Estoque", String(data.estoqueSemEstoque)],
      ],
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do negócio</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => setShowValues((prev) => !prev)}
            title={showValues ? "Ocultar valores" : "Mostrar valores"}
          >
            {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleExportPDF}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* ═══ RESUMO DO DIA ═══ */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Resumo de Hoje</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPICard icon={ShoppingCart} label="Vendas" value={data ? v(fmtR(data.totalVendasDia)) : "—"} sub={data ? `${data.qtdVendasDia} venda(s)` : ""} color="text-primary" loading={isLoading} />
          <KPICard icon={DollarSign} label="Recebido Hoje" value={data ? v(fmtR(data.recebidoHoje)) : "—"} color="text-primary" loading={isLoading} />
          <KPICard icon={TrendingUp} label="Lucro Estimado" value={data ? v(fmtR(data.lucroDia)) : "—"} color="text-primary" loading={isLoading} />
          <KPICard icon={CreditCard} label="Contas a Receber" value={data ? v(fmtR(data.totalAReceber)) : "—"} sub={data ? `${data.qtdPendentes} parcelas` : ""} loading={isLoading} />
          <KPICard icon={AlertTriangle} label="Parcelas Vencidas" value={data ? v(fmtR(data.totalVencido)) : "—"} sub={data ? `${data.qtdVencidas} parcela(s)` : ""} color="text-destructive" loading={isLoading} />
        </div>
      </div>

      {/* ═══ ALERTAS ═══ */}
      {(alertasAltos > 0 || estoqueCritico > 0 || (data?.qtdVencidas ?? 0) > 0 || (lembretes?.vencendoAmanha ?? 0) > 0) && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BellRing className="w-4 h-4 text-destructive" /> Alertas
              </h2>
              <Link to="/alertas"><Badge variant="destructive" className="text-[10px] cursor-pointer">{alertasAltos + (data?.qtdVencidas ?? 0) + estoqueCritico + (lembretes?.vencendoAmanha ?? 0)}</Badge></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
              {(lembretes?.vencendoAmanha ?? 0) > 0 && (
                <Link to="/cobrancas" className="flex items-center gap-2 text-yellow-600 hover:underline">
                  <CalendarClock className="w-3.5 h-3.5" /> {lembretes!.vencendoAmanha} parcela(s) vencem amanhã
                </Link>
              )}
              {(lembretes?.vencendoHoje ?? 0) > 0 && (
                <Link to="/cobrancas" className="flex items-center gap-2 text-orange-500 hover:underline">
                  <CalendarIcon className="w-3.5 h-3.5" /> {lembretes!.vencendoHoje} parcela(s) vencem hoje
                </Link>
              )}
              {(data?.qtdVencidas ?? 0) > 0 && (
                <Link to="/cobrancas" className="flex items-center gap-2 text-destructive hover:underline">
                  <AlertTriangle className="w-3.5 h-3.5" /> {data!.qtdVencidas} parcela(s) vencida(s) — {v(fmtR(data!.totalVencido))}
                </Link>
              )}
              {(lembretes?.clientesMultiplosAtraso ?? 0) > 0 && (
                <Link to="/cobrancas" className="flex items-center gap-2 text-destructive hover:underline">
                  <Users className="w-3.5 h-3.5" /> {lembretes!.clientesMultiplosAtraso} cliente(s) com 2+ parcelas atrasadas
                </Link>
              )}
              {estoqueCritico > 0 && (
                <Link to="/previsao-estoque" className="flex items-center gap-2 text-destructive hover:underline">
                  <PackageSearch className="w-3.5 h-3.5" /> {estoqueCritico} produto(s) estoque crítico
                </Link>
              )}
              {alertasAltos > 0 && (
                <Link to="/alertas" className="flex items-center gap-2 text-destructive hover:underline">
                  <BellRing className="w-3.5 h-3.5" /> {alertasAltos} alerta(s) de alta prioridade
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ PEDIDOS PENDENTES ═══ */}
      {pedidosDash && (pedidosDash.totalPendentes > 0 || pedidosDash.atrasados > 0) && (
        <Card className={pedidosDash.atrasados > 0 ? "border-destructive/20" : "border-primary/20"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Pedidos Pendentes
              </h2>
              <Link to="/agenda-entregas"><Badge variant="outline" className="text-[10px] cursor-pointer">Agenda</Badge></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{pedidosDash.totalPendentes}</p>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{pedidosDash.paraHoje}</p>
                <p className="text-[10px] text-muted-foreground">Para Hoje</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${pedidosDash.atrasados > 0 ? "text-destructive" : "text-foreground"}`}>{pedidosDash.atrasados}</p>
                <p className="text-[10px] text-muted-foreground">Atrasados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{v(fmtR(pedidosDash.valorPendente))}</p>
                <p className="text-[10px] text-muted-foreground">Valor Total</p>
              </div>
            </div>
            {pedidosDash.atrasados > 0 && (
              <Link to="/agenda-entregas" className="flex items-center gap-2 text-destructive text-sm mt-3 hover:underline">
                <AlertTriangle className="w-3.5 h-3.5" /> {pedidosDash.atrasados} pedido(s) com entrega atrasada
              </Link>
            )}
          </CardContent>
        </Card>
      )}


      {vendedorDash && vendedorDash.metaValor > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Minha Meta
              </h2>
              <Link to="/metas"><Badge variant="outline" className="text-[10px] cursor-pointer">Ver tudo</Badge></Link>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{v(fmtR(vendedorDash.totalMes))}</span>
                <span className="font-semibold text-foreground">{vendedorDash.percentualMeta}%</span>
              </div>
              <Progress value={Math.min(vendedorDash.percentualMeta, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Meta: {v(fmtR(vendedorDash.metaValor))}</span>
                <span>Comissão: {v(fmtR(vendedorDash.comissaoAcumulada))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ PERÍODO FILTER ═══ */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Período</h2>
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as DashboardPeriodo)}>
          <TabsList className="h-8">
            {PERIODOS.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="text-xs">{p.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Period KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={ShoppingCart} label={`Vendas (${PERIODOS.find(p=>p.value===periodo)?.label})`} value={pd ? v(fmtR(pd.totalVendas)) : "—"} sub={pd ? `${pd.qtdVendas} venda(s)` : ""} color="text-primary" loading={lPd} />
        <KPICard icon={DollarSign} label="Recebido" value={pd ? v(fmtR(pd.totalRecebido)) : "—"} color="text-primary" loading={lPd} />
        <KPICard icon={TrendingUp} label="Lucro Estimado" value={pd ? v(fmtR(pd.lucroPeriodo)) : "—"} color="text-primary" loading={lPd} />
        <KPICard icon={PackageX} label="Estoque Baixo" value={data ? `${data.estoqueBaixo.length}` : "—"} sub={`${data?.estoqueSemEstoque ?? 0} sem estoque`} color="text-destructive" loading={isLoading} />
      </div>

      {/* ═══ CHARTS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendas por dia */}
        {pd && pd.vendasPorDia.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Vendas por Dia</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ReBarChart data={pd.vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dia" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(val) => showValues ? `R$${val}` : "•••"} />
                <Tooltip formatter={(val: number) => showValues ? fmtR(val) : MASKED} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Recebimentos por forma */}
        {pd && pd.recebimentosPorForma.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Recebimentos por Forma</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pd.recebimentosPorForma} dataKey="valor" nameKey="forma" cx="50%" cy="50%" outerRadius={80} label={({ forma, valor }) => showValues ? `${forma}: ${fmtR(valor)}` : `${forma}: •••`}>
                  {pd.recebimentosPorForma.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip formatter={(val: number) => showValues ? fmtR(val) : MASKED} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* ═══ TABLES GRID ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* PRODUTOS MAIS VENDIDOS */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Produtos Mais Vendidos
              </h2>
              <Link to="/relatorios"><Badge variant="outline" className="text-[10px] cursor-pointer">Ver mais</Badge></Link>
            </div>
            <div className="space-y-2">
              {lPd ? <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p> :
                !pd?.topProdutos.length ? <p className="text-sm text-muted-foreground py-4 text-center">Sem vendas no período</p> :
                pd.topProdutos.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      <span className="text-sm font-medium text-foreground">{p.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{v(fmtR(p.total))}</p>
                      <p className="text-[10px] text-muted-foreground">{p.qtd} un</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* CLIENTES IMPORTANTES */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" /> Clientes Top
              </h2>
              <Link to="/clientes"><Badge variant="outline" className="text-[10px] cursor-pointer">Ver todos</Badge></Link>
            </div>
            <div className="space-y-2">
              {lPd ? <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p> :
                !pd?.topClientes.length ? <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p> :
                pd.topClientes.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      <span className="text-sm font-medium text-foreground">{c.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{v(fmtR(c.total))}</p>
                      <p className="text-[10px] text-muted-foreground">{c.qtd} vendas</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* VENDAS RECENTES */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" /> Vendas Recentes
              </h2>
              <Link to="/vendas"><Badge variant="outline" className="text-[10px] cursor-pointer">Ver todas</Badge></Link>
            </div>
            <div className="space-y-2">
              {isLoading ? <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p> :
                !data?.vendasRecentes.length ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma venda hoje</p> :
                data.vendasRecentes.map((vr: any) => (
                  <div key={vr.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <p className="text-sm font-medium text-foreground">{vr.clientes?.nome ?? "Cliente avulso"}</p>
                    <p className="text-sm font-semibold text-primary">{v(fmtR(Number(vr.total)))}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* ESTOQUE BAIXO */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <PackageX className="w-4 h-4 text-destructive" /> Estoque Baixo
              </h2>
              <Link to="/estoque"><Badge variant="outline" className="text-[10px] cursor-pointer">Ver estoque</Badge></Link>
            </div>
            <div className="space-y-2">
              {isLoading ? <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p> :
                !data?.estoqueBaixo.length ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhum produto com estoque baixo 🎉</p> :
                data.estoqueBaixo.slice(0, 8).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <p className="text-sm font-medium text-foreground">{e.produtos?.nome}</p>
                    <Badge variant={Number(e.quantidade) <= 0 ? "destructive" : "secondary"}>
                      {Number(e.quantidade)} {e.produtos?.unidade ?? "un"}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ PARCELAS VENCIDAS ═══ */}
      {data && data.parcelasVencidas.length > 0 && (
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Parcelas Vencidas
              </h2>
              <Link to="/financeiro"><Badge variant="destructive" className="text-[10px] cursor-pointer">{data.qtdVencidas} total</Badge></Link>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Cliente</TableHead><TableHead>Nº</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Saldo</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.parcelasVencidas.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{p.clientes?.nome ?? "—"}</TableCell>
                    <TableCell>{p.numero}ª</TableCell>
                    <TableCell className="text-sm">{format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{v(fmtR(Number(p.saldo)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ═══ RANKING VENDEDORES (admin only) ═══ */}
      {isAdmin && pd && pd.rankingVendedores.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Desempenho de Vendedores
              </h2>
              <Link to="/metas"><Badge variant="outline" className="text-[10px] cursor-pointer">Ver metas</Badge></Link>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pd.rankingVendedores.map((rv) => (
                  <TableRow key={rv.id}>
                    <TableCell className="font-medium">{rv.nome}</TableCell>
                    <TableCell className="text-right">{rv.qtd}</TableCell>
                    <TableCell className="text-right font-semibold">{v(fmtR(rv.total))}</TableCell>
                    <TableCell className="text-right">
                      {rv.metaValor > 0 ? (
                        <span className={cn(rv.pctMeta >= 100 ? "text-primary font-bold" : rv.pctMeta >= 70 ? "text-yellow-600" : "text-destructive")}>
                          {rv.pctMeta.toFixed(0)}%
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{rv.comissao > 0 ? v(fmtR(rv.comissao)) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TOP INDICADORES */}
      {isAdmin && topIndicadores && topIndicadores.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Top Clientes Indicadores
              </h2>
              <Link to="/clientes"><Badge variant="outline" className="text-[10px] cursor-pointer">Ver clientes</Badge></Link>
            </div>
            <div className="space-y-2">
              {topIndicadores.slice(0, 10).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}º</span>
                    <p className="text-sm font-medium text-foreground">{c.nome}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3 text-yellow-500" /> {c.pontos_indicacao} pts
                  </Badge>
                </div>
              ))}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {topIndicadores.reduce((s, c) => s + c.pontos_indicacao, 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">Total de Pontos Distribuídos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {topIndicadores.length}
                </p>
                <p className="text-[10px] text-muted-foreground">Clientes Indicadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Quick Actions */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Pedidos", icon: ClipboardList, path: "/pedidos", color: "text-primary" },
          { label: "Entregas", icon: Truck, path: "/agenda-entregas", color: (pedidosDash?.atrasados ?? 0) > 0 ? "text-destructive" : "text-primary" },
          { label: "Mapa", icon: MapPin, path: "/mapa-clientes", color: "text-primary" },
          { label: "Metas", icon: Target, path: "/metas", color: "text-primary" },
          { label: "Alertas", icon: BellRing, path: "/alertas", color: alertasAltos > 0 ? "text-destructive" : "text-primary" },
        ].map((item) => (
          <Link key={item.path} to={item.path}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-3 text-center">
                <item.icon className={cn("w-5 h-5 mx-auto mb-1", item.color)} />
                <p className="text-[11px] font-medium text-foreground">{item.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ═══ Sub-components ═══

function KPICard({ icon: Icon, label, value, sub, color, loading }: {
  icon: any; label: string; value: string; sub?: string; color?: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <Icon className={cn("w-4 h-4", color ?? "text-muted-foreground")} />
        </div>
        <p className={cn("text-xl font-bold", color ?? "text-foreground")}>{loading ? "..." : value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
