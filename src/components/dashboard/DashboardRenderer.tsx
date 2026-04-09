import React from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, DollarSign, AlertTriangle, CreditCard, PackageX,
  TrendingUp, Target, BellRing, MapPin, PackageSearch, Users,
  Calendar as CalendarIcon, UserCheck, BarChart3, Award, Star, CalendarClock,
  ClipboardList, Truck, XCircle, CheckCircle2, Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { KPICard } from "./KPICard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DashboardItem, VisualConfig } from "@/contexts/UserPreferencesContext";
import { DEFAULT_CHART_COLORS } from "@/lib/colorUtils";

interface DashboardRendererProps {
  layout: DashboardItem[];
  visualConfig: VisualConfig;
  data: any;
  periodoData: any;
  vendedorData?: any;
  alertasData?: any;
  previsoesData?: any;
  lembretesData?: any;
  pedidosData?: any;
  topIndicadores?: any;
  isLoading?: boolean;
  isPeriodoLoading?: boolean;
  showValues?: boolean;
  periodo?: string;
  setPeriodo?: (v: any) => void;
  isAdmin?: boolean;
  isPreview?: boolean;
}

const MASKED = "R$ •••••";
const fmtR = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function DashboardRenderer({
  layout, visualConfig, data, periodoData, vendedorData, alertasData, 
  previsoesData, lembretesData, pedidosData, topIndicadores,
  isLoading, isPeriodoLoading, showValues = true, periodo = "mes", 
  setPeriodo, isAdmin, isPreview = false
}: DashboardRendererProps) {
  
  const v = (val: string) => showValues ? val : MASKED;

  const chartColors = visualConfig.charts && visualConfig.charts.length > 0 
    ? visualConfig.charts 
    : [ "hsl(var(--primary))", ...DEFAULT_CHART_COLORS.slice(1) ];

  const alertasAltos = (alertasData || []).filter((a: any) => a.prioridade === "alta").length;
  const estoqueCritico = (previsoesData || []).filter((p: any) => p.urgencia === "critico").length;

  const sections: Record<string, React.ReactNode> = {
    "resumo-dia": (
      <div key="resumo-dia">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Resumo de Hoje</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPICard 
            icon={ShoppingCart} 
            label="Vendas" 
            value={data ? v(fmtR(data.totalVendasDia)) : "—"} 
            sub={data ? `${data.qtdVendasDia} venda(s) líq.` : ""} 
            color="text-primary" 
            loading={isLoading} 
            title="Total de vendas feitas hoje, subtraindo devoluções de vendas de hoje"
          />
          <KPICard icon={TrendingUp} label="Lucro Estimado" value={data ? v(fmtR(data.lucroDia)) : "—"} color="text-primary" loading={isLoading} />
          <KPICard icon={CreditCard} label="A Receber Hoje" value={data ? v(fmtR(data.totalAReceber)) : "—"} sub={data ? `${data.qtdPendentes} parcela(s)` : ""} loading={isLoading} />
          <KPICard 
            icon={DollarSign} 
            label="Recebido Hoje" 
            value={data ? v(fmtR(data.recebidoHoje)) : "—"} 
            sub={data ? `Vendas: ${fmtR(data.recebidoAVista)} | Fiados: ${fmtR(data.recebidoParcelas)}` : ""}
            color="text-primary" 
            loading={isLoading} 
          />
          <KPICard icon={AlertTriangle} label="Parcelas Vencidas" value={data ? v(fmtR(data.totalVencido)) : "—"} sub={data ? `${data.qtdVencidas} parcela(s)` : ""} color="text-destructive" loading={isLoading} />
        </div>
      </div>
    ),

    "alertas": (
      <Card key="alertas" className={cn("border-destructive/20", alertasAltos + (data?.qtdVencidas ?? 0) + estoqueCritico + (lembretesData?.vencendoAmanha ?? 0) === 0 ? "bg-muted/30 border-muted" : "bg-destructive/5")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BellRing className="w-4 h-4 text-primary" /> Alertas do Sistema
            </h2>
            {alertasAltos + (data?.qtdVencidas ?? 0) + estoqueCritico + (lembretesData?.vencendoAmanha ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[10px]">{alertasAltos + (data?.qtdVencidas ?? 0) + estoqueCritico + (lembretesData?.vencendoAmanha ?? 0)}</Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {alertasAltos + (data?.qtdVencidas ?? 0) + estoqueCritico + (lembretesData?.vencendoAmanha ?? 0) === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2 italic col-span-full">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Tudo certo! Nenhum alerta crítico no momento.
              </div>
            ) : (
              <>
                {(lembretesData?.vencendoAmanha ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <CalendarClock className="w-3.5 h-3.5" /> {lembretesData!.vencendoAmanha} parcela(s) vencem amanhã
                  </div>
                )}
                {(data?.qtdVencidas ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5" /> {data!.qtdVencidas} parcela(s) vencida(s)
                  </div>
                )}
                {estoqueCritico > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <PackageSearch className="w-3.5 h-3.5" /> {estoqueCritico} produto(s) estoque crítico
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    ),

    "pedidos-pendentes": (
      <Card key="pedidos-pendentes" className={cn("h-full", pedidosData?.atrasados > 0 ? "border-destructive/20" : "border-primary/20", !pedidosData?.totalPendentes && "opacity-80")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Pedidos Pendentes
            </h2>
            <Badge variant="outline" className="text-[10px]">Agenda</Badge>
          </div>
          {!pedidosData || pedidosData.totalPendentes === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2 text-xs italic">
              <Info className="w-3.5 h-3.5" /> Nenhum pedido pendente ou atrasado.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{pedidosData.totalPendentes}</p>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{pedidosData.paraHoje}</p>
                <p className="text-[10px] text-muted-foreground">Para Hoje</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${pedidosData.atrasados > 0 ? "text-destructive" : "text-foreground"}`}>{pedidosData.atrasados}</p>
                <p className="text-[10px] text-muted-foreground">Atrasados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{v(fmtR(pedidosData.valorPendente))}</p>
                <p className="text-[10px] text-muted-foreground">Valor Total</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),

    "minha-meta": (
      <Card key="minha-meta" className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Minha Meta
            </h2>
          </div>
          {!vendedorData || (vendedorData.metaValor || 0) === 0 ? (
            <div className="text-xs text-muted-foreground italic py-1 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" /> Defina uma meta financeira para acompanhar seu progresso.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{v(fmtR(vendedorData.totalMes))}</span>
                <span className="font-semibold text-foreground">{vendedorData.percentualMeta}%</span>
              </div>
              <Progress value={Math.min(vendedorData.percentualMeta, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Meta: {v(fmtR(vendedorData.metaValor))}</span>
                <span>Comissão: {v(fmtR(vendedorData.comissaoAcumulada))}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),

    "periodo-kpis": (
      <div key="periodo-kpis" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Relatórios do Período</h2>
          {!isPreview && setPeriodo && (
             <Tabs value={periodo} onValueChange={setPeriodo}>
                <TabsList className="h-8">
                  <TabsTrigger value="hoje" className="text-xs">Hoje</TabsTrigger>
                  <TabsTrigger value="7dias" className="text-xs">7 dias</TabsTrigger>
                  <TabsTrigger value="30dias" className="text-xs">30 dias</TabsTrigger>
                  <TabsTrigger value="mes" className="text-xs">Mês</TabsTrigger>
                </TabsList>
             </Tabs>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPICard icon={ShoppingCart} label="Vendas Período" value={periodoData ? v(fmtR(periodoData.totalVendas)) : "—"} sub={periodoData ? `${periodoData.qtdVendas} venda(s) líq.` : ""} color="text-primary" loading={isPeriodoLoading} title="Total de vendas no período, subtraindo apenas devoluções de vendas deste período" />
          <KPICard 
            icon={TrendingUp} 
            label="Lucro Período" 
            value={periodoData ? v(fmtR(periodoData.lucroPeriodo)) : "—"} 
            sub={periodoData?.lucroPeriodo === 0 && periodoData?.totalVendas > 0 ? "Sem dados de custo" : ""}
            color="text-primary" 
            loading={isPeriodoLoading} 
          />
          <KPICard icon={DollarSign} label="Recebido Total" value={periodoData ? v(fmtR(periodoData.totalRecebido)) : "—"} color="text-primary" loading={isPeriodoLoading} title="Total de entradas financeiras no período (Vendas à vista + recebimento de fiados)" />
          <KPICard icon={PackageX} label="Alerta Estoque" value={data ? `${data.estoqueBaixo.length}` : "—"} sub={`${data?.estoqueSemEstoque ?? 0} sem estoque`} color="text-destructive" loading={isLoading} />
          <KPICard icon={XCircle} label="Vendas Canc." value={periodoData ? v(fmtR(periodoData.totalCancelado ?? 0)) : "—"} sub={periodoData ? `${periodoData.qtdCanceladas ?? 0} cancelada(s)` : ""} color="text-destructive" loading={isPeriodoLoading} />
        </div>
      </div>
    ),

    "vendas-por-dia": (
      periodoData && (periodoData.vendasPorDia?.length > 0 || isPreview) && (
        <Card key="vendas-por-dia" className="h-full">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Vendas por Dia</h3>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={isPreview ? [
                  { dia: "Seg", total: 1200 }, { dia: "Ter", total: 2100 }, { dia: "Qua", total: 1800 }, { dia: "Qui", total: 2500 }
                ] : periodoData.vendasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" className="text-[10px]" />
                  <YAxis className="text-[10px]" tickFormatter={(val) => showValues ? `R$${val}` : "•••"} />
                  <Tooltip formatter={(val: number) => showValues ? fmtR(val) : MASKED} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )
    ),

    "recebimentos-forma": (
      periodoData && (periodoData.recebimentosPorForma?.length > 0 || isPreview) && (
        <Card key="recebimentos-forma" className="h-full">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Recebimentos por Forma</h3>
            <div className="flex flex-row items-center justify-between h-[180px] gap-2">
              <div className="w-[100px] shrink-0 flex flex-col justify-center gap-2">
                {(isPreview ? [
                  { forma: "dinheiro", valor: 5000 }, { forma: "cartao_credito", valor: 8000 }, { forma: "pix", valor: 4500 }
                ] : periodoData.recebimentosPorForma).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 leading-none">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-muted-foreground truncate font-medium">
                        {item.forma ? item.forma.charAt(0).toUpperCase() + item.forma.slice(1).replace(/_/g, ' ') : ''}
                      </span>
                      <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
                        {showValues ? fmtR(item.valor) : "R$ •••"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex-1 h-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={isPreview ? [
                        { forma: "Dinheiro", valor: 5000 }, { forma: "Cartão", valor: 8000 }, { forma: "Pix", valor: 4500 }
                      ] : periodoData.recebimentosPorForma} 
                      dataKey="valor" nameKey="forma" cx="65%" cy="50%" 
                      outerRadius={isPreview ? 50 : 55} 
                      paddingAngle={2}
                      stroke="none"
                      label={isPreview ? false : ({ forma, valor }) => showValues ? `${forma}: ${fmtR(valor)}` : `${forma}: •••`}
                      labelLine={true}
                    >
                      {(isPreview ? [0,1,2] : periodoData.recebimentosPorForma).map((_: any, i: number) => (
                        <Cell key={i} fill={chartColors[i % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => showValues ? fmtR(val) : MASKED} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    ),

    "produtos-vendidos": (
      <Card key="produtos-vendidos" className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Produtos Mais Vendidos
            </h2>
          </div>
          <div className="space-y-2">
            {!periodoData || (isPreview ? false : (periodoData?.topProdutos?.length || 0) === 0) ? (
              <div className="text-xs text-muted-foreground italic py-2">Nenhum produto vendido no período.</div>
            ) : (
              (isPreview ? [
                { nome: "Coca-Cola 2L", qtd: 154, total: 1250 },
                { nome: "Arroz Tio João 5kg", qtd: 82, total: 2450 },
              ] : (periodoData?.topProdutos.slice(0, 5) || [])).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{p.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{v(fmtR(p.total))}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),

    "clientes-top": (
      <Card key="clientes-top" className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Clientes que Mais Compram
            </h2>
          </div>
          <div className="space-y-2">
             {!periodoData || (isPreview ? false : (periodoData?.topClientes?.length || 0) === 0) ? (
              <div className="text-xs text-muted-foreground italic py-2">Nenhum cliente registrado no período.</div>
            ) : (
              (isPreview ? [
                { nome: "João Silva", total: 4500, qtd: 12 },
                { nome: "Maria Oliveira", total: 3200, qtd: 8 },
              ] : (periodoData?.topClientes.slice(0, 5) || [])).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{c.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{v(fmtR(c.total))}</p>
                    <p className="text-[10px] text-muted-foreground">{c.qtd} compra(s)</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),

    "vendas-recentes": (
      <Card key="vendas-recentes" className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Vendas Recentes
            </h2>
          </div>
          <div className="space-y-2">
            {!data || (isPreview ? false : (data?.vendasRecentes?.length || 0) === 0) ? (
              <div className="text-xs text-muted-foreground italic py-2">Nenhuma venda realizada hoje.</div>
            ) : (
              (isPreview ? [
                { id: "1", total: 154, clientes: { nome: "Avulso" }, data_venda: new Date().toISOString() },
                { id: "2", total: 82, clientes: { nome: "Consumidor Final" }, data_venda: new Date().toISOString() },
              ] : (data?.vendasRecentes.slice(0, 5) || [])).map((venda: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{venda.clientes?.nome || "Avulso"}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(venda.data_venda), "HH:mm")}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{v(fmtR(venda.total))}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),

    "estoque-baixo": (
       <Card key="estoque-baixo" className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PackageSearch className="w-4 h-4 text-destructive" /> Itens em Falta/Baixo
            </h2>
          </div>
          <div className="space-y-2">
            {!data || (isPreview ? false : (data?.estoqueBaixo?.length || 0) === 0) ? (
              <div className="text-xs text-muted-foreground italic py-2">Estoque normalizado.</div>
            ) : (
              (isPreview ? [
                { id: "1", quantidade: 2, produtos: { nome: "Cerveja Skol 600ml", unidade: "UN" } },
                { id: "2", quantidade: 0, produtos: { nome: "Arroz Tio João 5kg", unidade: "PCT" } },
              ] : (data?.estoqueBaixo.slice(0, 5) || [])).map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{e.produtos?.nome}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant={Number(e.quantidade) <= 0 ? "destructive" : "secondary"} className="text-[9px]">
                      {e.quantidade} {e.produtos?.unidade}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),

    "parcelas-vencidas": (
      <Card key="parcelas-vencidas" className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3 text-destructive">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Cobranças Vencidas
            </h2>
          </div>
          <div className="space-y-2">
            {!data || (isPreview ? false : (data?.parcelasVencidas?.length || 0) === 0) ? (
              <div className="text-xs text-muted-foreground italic py-2 text-center">Nenhuma cobrança vencida! 🎉</div>
            ) : (
              (isPreview ? [
                { id: "1", saldo: 450, clientes: { nome: "Marcos Oliveira" }, numero: 1, vencimento: "2024-03-20" },
                { id: "2", saldo: 320, clientes: { nome: "Ana Paula" }, numero: 2, vencimento: "2024-03-25" },
              ] : (data?.parcelasVencidas.slice(0, 5) || [])).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{p.clientes?.nome}</span>
                    <span className="text-[10px] text-destructive">Vencimento: {format(new Date(p.vencimento), "dd/MM")}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-destructive">{v(fmtR(p.saldo))}</p>
                    <p className="text-[10px] text-muted-foreground">Parc. {p.numero}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),

    "ranking-vendedores": (
      isAdmin && (periodoData?.rankingVendedores?.length > 0 || isPreview) && (
        <Card key="ranking-vendedores" className="h-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Desempenho de Vendedores
              </h2>
            </div>
            <Table>
              <TableBody>
                {(isPreview ? [
                  { nome: "Julia Santos", total: 15400, pctMeta: 95 },
                  { nome: "Ricardo Lima", total: 12800, pctMeta: 110 },
                ] : periodoData.rankingVendedores.slice(0, 5)).map((rv: any) => (
                  <TableRow key={rv.id || rv.nome}>
                    <TableCell className="py-2 text-xs font-medium">{rv.nome}</TableCell>
                    <TableCell className="py-2 text-xs text-right font-bold">{v(fmtR(rv.total))}</TableCell>
                    <TableCell className="py-2 text-xs text-right">
                      <span className={cn(rv.pctMeta >= 100 ? "text-primary" : "text-yellow-600")}>
                        {rv.pctMeta}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )
    ),

    "top-indicadores": (
      <Card key="top-indicadores" className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3 text-sm font-semibold text-foreground">
            <h2 className="flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Top Clientes Indicadores</h2>
          </div>
          <div className="space-y-2">
            {(!topIndicadores || topIndicadores.length === 0) && !isPreview ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4 text-xs italic justify-center">
                <Info className="w-3.5 h-3.5" /> Nenhuma indicação registrada.
              </div>
            ) : (
              (isPreview ? [
                { nome: "Marcos Oliveira", pontos_indicacao: 450 },
                { nome: "Ana Paula", pontos_indicacao: 320 },
              ] : topIndicadores.slice(0, 5)).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1 border-b last:border-0 border-border/50">
                  <span className="text-xs truncate max-w-[150px] font-medium text-foreground">{c.nome}</span>
                  <Badge variant="secondary" className="text-[9px] gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                    <Star className="w-2 h-2 fill-primary text-primary"/> {c.pontos_indicacao} pts
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),

    "atalhos": (
      <div key="atalhos" className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-square flex items-center justify-center border rounded-lg bg-card shadow-sm opacity-60">
             <div className="h-6 w-6 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    ),
  };

  // Lógica para agrupar itens em colunas
  // Filtramos apenas itens visíveis E que resultam em algum conteúdo renderizável
  const visibleLayout = layout.filter(item => {
    if (!item.visible) return false;
    const content = sections[item.id];
    return content !== null && content !== undefined && content !== false;
  });
  const groupedLayout: { type: 'single' | 'grid', items: DashboardItem[] }[] = [];
  
  let i = 0;
  while (i < visibleLayout.length) {
    const current = visibleLayout[i];
    
    // Se for 1 coluna, adiciona como single
    if (current.columns !== 2) {
      groupedLayout.push({ type: 'single', items: [current] });
      i++;
    } else {
      // Se for 2 colunas, tenta pegar o próximo também
      const next = visibleLayout[i + 1];
      if (next && next.columns === 2) {
        groupedLayout.push({ type: 'grid', items: [current, next] });
        i += 2;
      } else {
        // Se for 2 colunas mas o próximo não for, renderiza como single (full)
        groupedLayout.push({ type: 'single', items: [current] });
        i++;
      }
    }
  }

  return (
    <div className="space-y-6">
      {groupedLayout.map((group, groupIndex) => {
        if (group.type === 'single') {
          return sections[group.items[0].id] || null;
        }
        return (
          <div key={`group-${groupIndex}`} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {group.items.map(item => (
              <div key={item.id} className="h-full">
                {sections[item.id] || null}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
