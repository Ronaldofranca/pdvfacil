import { useState, useMemo } from "react";
import {
  BarChart3, Calendar as CalendarIcon, TrendingUp, Package, CreditCard,
  AlertTriangle, DollarSign, BarChart, Users, MapPin, Truck, FileDown,
  FileSpreadsheet, Filter, UserCheck, Award, Star, ClipboardList
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  useRelVendasPeriodo, useRelVendasDetalhadas, useRelProdutosVendidos,
  useRelParcelasPagas, useRelParcelasVencidas, useRelTodasParcelas,
  useRelParcelasPorCliente, useRelLucroProduto, useRelCurvaABC,
  useRelVendedores, useRelClientes, useRelEstoqueAtual,
  useRelMovimentacaoEstoque, useRelMetasVendedores, useRelRomaneios,
  useRelPedidos,
} from "@/hooks/useRelatorios";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useTopIndicadores } from "@/hooks/useIndicacoes";
import { useNiveisRecompensa, getNivelAtual } from "@/hooks/useNiveisRecompensa";
import { exportCSV, exportPDF, fmtR, fmtN } from "@/lib/reportExport";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 200 70% 50%))",
  "hsl(var(--chart-3, 150 60% 45%))",
  "hsl(var(--chart-4, 40 80% 55%))",
  "hsl(var(--chart-5, 0 70% 55%))",
];
const ABC_COLORS: Record<string, string> = { A: "hsl(var(--primary))", B: "hsl(var(--chart-4, 40 80% 55%))", C: "hsl(var(--chart-5, 0 70% 55%))" };

export default function RelatoriosPage() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(now));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(now));
  const [vendedorFilter, setVendedorFilter] = useState("all");
  const [clienteFilter, setClienteFilter] = useState("all");

  const inicio = format(dateFrom, "yyyy-MM-dd");
  const fim = format(dateTo, "yyyy-MM-dd");
  const periodoLabel = `${format(dateFrom, "dd/MM/yyyy")} a ${format(dateTo, "dd/MM/yyyy")}`;

  const { data: empresas } = useEmpresas();
  const empresaNome = empresas?.[0]?.nome ?? "VendaForce";

  // Data hooks
  const { data: vendas, isLoading: lVendas } = useRelVendasPeriodo(inicio, fim);
  const { data: vendasDet } = useRelVendasDetalhadas(inicio, fim);
  const { data: prodVendidos, isLoading: lProd } = useRelProdutosVendidos(inicio, fim);
  const { data: pgtos, isLoading: lPgtos } = useRelParcelasPagas(inicio, fim);
  const { data: vencidas, isLoading: lVenc } = useRelParcelasVencidas();
  const { data: todasParcelas, isLoading: lTP } = useRelTodasParcelas(inicio, fim);
  const { data: parcelasPorCliente, isLoading: lPC } = useRelParcelasPorCliente();
  const { data: lucros, isLoading: lLucro } = useRelLucroProduto(inicio, fim);
  const { data: curvaABC, isLoading: lABC } = useRelCurvaABC(inicio, fim);
  const { data: vendedores } = useRelVendedores();
  const { data: clientes } = useRelClientes();
  const { data: estoque, isLoading: lEst } = useRelEstoqueAtual();
  const { data: movimentos, isLoading: lMov } = useRelMovimentacaoEstoque(inicio, fim);
  const { data: metas, isLoading: lMetas } = useRelMetasVendedores(now.getMonth() + 1, now.getFullYear());
  const { data: romaneios, isLoading: lRom } = useRelRomaneios(inicio, fim);
  const { data: pedidosRel, isLoading: lPed } = useRelPedidos(inicio, fim);
  // Vendedor name map
  const vendedorMap = useMemo(() => {
    const m = new Map<string, string>();
    vendedores?.forEach((v) => m.set(v.user_id, v.nome));
    return m;
  }, [vendedores]);

  // Filtered vendas
  const vendasFiltered = useMemo(() => {
    let v = vendas ?? [];
    if (vendedorFilter !== "all") v = v.filter((x) => x.vendedor_id === vendedorFilter);
    if (clienteFilter !== "all") v = v.filter((x) => (x as any).clientes?.nome === clienteFilter);
    return v;
  }, [vendas, vendedorFilter, clienteFilter]);

  // Vendas por vendedor
  const vendasPorVendedor = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; total: number; desconto: number }>();
    (vendas ?? []).forEach((v) => {
      const vid = v.vendedor_id;
      const nome = vendedorMap.get(vid) ?? vid.slice(0, 8);
      const curr = map.get(vid) ?? { nome, qtd: 0, total: 0, desconto: 0 };
      curr.qtd += 1;
      curr.total += Number(v.total);
      curr.desconto += Number(v.desconto_total);
      map.set(vid, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [vendas, vendedorMap]);

  // Vendas por cliente
  const vendasPorCliente = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; total: number }>();
    (vendas ?? []).forEach((v) => {
      const nome = (v as any).clientes?.nome ?? "Sem cliente";
      const curr = map.get(nome) ?? { nome, qtd: 0, total: 0 };
      curr.qtd += 1;
      curr.total += Number(v.total);
      map.set(nome, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [vendas]);

  // Vendas por produto (from detailed)
  const vendasPorProduto = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; total: number; desconto: number }>();
    (vendasDet ?? []).forEach((v) => {
      ((v as any).itens_venda ?? []).forEach((it: any) => {
        const curr = map.get(it.produto_id) ?? { nome: it.nome_produto, qtd: 0, total: 0, desconto: 0 };
        curr.qtd += Number(it.quantidade);
        curr.total += Number(it.subtotal);
        curr.desconto += Number(it.desconto);
        map.set(it.produto_id, curr);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [vendasDet]);

  // Totals
  const totalVendas = vendasFiltered.reduce((s, v) => s + Number(v.total), 0);
  const totalPgtos = pgtos?.reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;
  const totalVencido = vencidas?.reduce((s, p) => s + Number(p.saldo), 0) ?? 0;
  const totalPendente = (todasParcelas ?? []).filter((p) => p.status === "pendente").reduce((s, p) => s + Number(p.saldo ?? 0), 0);

  // Chart data
  const vendasPorDia = useMemo(() => {
    const map = new Map<string, number>();
    vendasFiltered.forEach((v) => {
      const dia = format(new Date(v.data_venda), "dd/MM");
      map.set(dia, (map.get(dia) ?? 0) + Number(v.total));
    });
    return Array.from(map.entries()).map(([dia, total]) => ({ dia, total }));
  }, [vendasFiltered]);

  const pgtosPorForma = useMemo(() => {
    const map = new Map<string, number>();
    pgtos?.forEach((p) => {
      const forma = p.forma_pagamento || "outro";
      map.set(forma, (map.get(forma) ?? 0) + Number(p.valor_pago));
    });
    return Array.from(map.entries()).map(([forma, valor]) => ({ forma: forma.replace(/_/g, " "), valor }));
  }, [pgtos]);

  // Lucro por vendedor
  const lucroPorVendedor = useMemo(() => {
    const map = new Map<string, { nome: string; receita: number; custo: number; lucro: number }>();
    (vendasDet ?? []).forEach((v) => {
      const vid = v.vendedor_id;
      const nome = vendedorMap.get(vid) ?? vid.slice(0, 8);
      const curr = map.get(vid) ?? { nome, receita: 0, custo: 0, lucro: 0 };
      curr.receita += Number(v.total);
      map.set(vid, curr);
    });
    // Approximate cost from lucros data
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita);
  }, [vendasDet, vendedorMap]);

  // Export helpers
  const doExportCSV = (rows: Record<string, any>[], name: string) => exportCSV(rows, `${name}_${inicio}_${fim}.csv`);
  const doExportPDF = (title: string, headers: string[], rows: string[][], totals?: string[]) =>
    exportPDF({ title, periodo: periodoLabel, empresa: empresaNome, headers, rows, totals });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Relatórios gerenciais completos</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-2 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <DatePicker label="De" date={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
            <DatePicker label="Até" date={dateTo} onSelect={(d) => d && setDateTo(d)} />
          </div>
          <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {vendedores?.map((v) => (
                <SelectItem key={v.user_id} value={v.user_id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos clientes</SelectItem>
              {clientes?.map((c) => (
                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Vendas" value={`${vendasFiltered.length}`} sub={fmtR(totalVendas)} />
        <SummaryCard label="Recebido" value={fmtR(totalPgtos)} color="text-primary" />
        <SummaryCard label="Pendente" value={fmtR(totalPendente)} color="text-yellow-600" />
        <SummaryCard label="Vencido" value={fmtR(totalVencido)} color="text-destructive" />
        <SummaryCard label="Produtos" value={`${prodVendidos?.reduce((s, p) => s + p.qtd, 0) ?? 0}`} sub="unidades vendidas" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vendas">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="vendas" className="gap-1 text-xs"><TrendingUp className="w-3.5 h-3.5" />Vendas</TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1 text-xs"><Package className="w-3.5 h-3.5" />Produtos</TabsTrigger>
          <TabsTrigger value="estoque" className="gap-1 text-xs"><Package className="w-3.5 h-3.5" />Estoque</TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1 text-xs"><DollarSign className="w-3.5 h-3.5" />Financeiro</TabsTrigger>
          <TabsTrigger value="parcelas" className="gap-1 text-xs"><CreditCard className="w-3.5 h-3.5" />Parcelas</TabsTrigger>
          <TabsTrigger value="recebimentos" className="gap-1 text-xs"><CreditCard className="w-3.5 h-3.5" />Recebimentos</TabsTrigger>
          <TabsTrigger value="lucro" className="gap-1 text-xs"><DollarSign className="w-3.5 h-3.5" />Lucro</TabsTrigger>
          <TabsTrigger value="vendedores" className="gap-1 text-xs"><Users className="w-3.5 h-3.5" />Vendedores</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1 text-xs"><UserCheck className="w-3.5 h-3.5" />Clientes</TabsTrigger>
          <TabsTrigger value="romaneio" className="gap-1 text-xs"><Truck className="w-3.5 h-3.5" />Romaneio</TabsTrigger>
          <TabsTrigger value="abc" className="gap-1 text-xs"><BarChart className="w-3.5 h-3.5" />ABC</TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-1 text-xs"><ClipboardList className="w-3.5 h-3.5" />Pedidos</TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1 text-xs"><Award className="w-3.5 h-3.5" />Ranking</TabsTrigger>
        </TabsList>

        {/* ═══ VENDAS ═══ */}
        <TabsContent value="vendas" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV(vendasFiltered.map((v) => ({
              Data: format(new Date(v.data_venda), "dd/MM/yyyy HH:mm"),
              Cliente: (v as any).clientes?.nome ?? "—",
              Vendedor: vendedorMap.get(v.vendedor_id) ?? "",
              Subtotal: v.subtotal, Desconto: v.desconto_total, Total: v.total,
            })), "vendas")}
            onPDF={() => doExportPDF("Relatório de Vendas",
              ["Data", "Cliente", "Vendedor", "Total"],
              vendasFiltered.map((v) => [
                format(new Date(v.data_venda), "dd/MM/yyyy HH:mm"),
                (v as any).clientes?.nome ?? "—",
                vendedorMap.get(v.vendedor_id) ?? "",
                fmtR(Number(v.total)),
              ]),
              ["TOTAL", "", "", fmtR(totalVendas)]
            )}
          />
          {vendasPorDia.length > 0 && (
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <ReBarChart data={vendasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => fmtR(v)} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Sub-tabs: por período, vendedor, cliente, produto */}
          <Tabs defaultValue="periodo">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="periodo" className="text-xs">Por Período</TabsTrigger>
              <TabsTrigger value="vendedor" className="text-xs">Por Vendedor</TabsTrigger>
              <TabsTrigger value="cliente" className="text-xs">Por Cliente</TabsTrigger>
              <TabsTrigger value="produto" className="text-xs">Por Produto</TabsTrigger>
            </TabsList>

            <TabsContent value="periodo">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Desconto</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader><TableBody>
                {lVendas ? <LR cols={5} /> : !vendasFiltered.length ? <ER cols={5} /> : vendasFiltered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">{format(new Date(v.data_venda), "dd/MM/yy HH:mm")}</TableCell>
                    <TableCell>{(v as any).clientes?.nome ?? "—"}</TableCell>
                    <TableCell>{vendedorMap.get(v.vendedor_id) ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtR(Number(v.desconto_total))}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(Number(v.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>

            <TabsContent value="vendedor">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Vendedor</TableHead><TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Desconto</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader><TableBody>
                {vendasPorVendedor.map((v) => (
                  <TableRow key={v.nome}>
                    <TableCell className="font-medium">{v.nome}</TableCell>
                    <TableCell className="text-right">{v.qtd}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtR(v.desconto)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(v.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>

            <TabsContent value="cliente">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Cliente</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader><TableBody>
                {vendasPorCliente.map((c) => (
                  <TableRow key={c.nome}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-right">{c.qtd}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>

            <TabsContent value="produto">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Desconto</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader><TableBody>
                {vendasPorProduto.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-right">{p.qtd}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtR(p.desconto)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ═══ PRODUTOS ═══ */}
        <TabsContent value="produtos" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV((prodVendidos ?? []).map((p) => ({ Produto: p.nome, Qtd: p.qtd, Receita: p.receita })), "produtos")}
            onPDF={() => doExportPDF("Relatório de Produtos",
              ["Produto", "Qtd Vendida", "Receita"],
              (prodVendidos ?? []).map((p) => [p.nome, String(p.qtd), fmtR(p.receita)])
            )}
          />
          <Tabs defaultValue="mais">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="mais" className="text-xs">Mais Vendidos</TabsTrigger>
              <TabsTrigger value="menos" className="text-xs">Menos Vendidos</TabsTrigger>
            </TabsList>
            <TabsContent value="mais">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Receita</TableHead>
              </TableRow></TableHeader><TableBody>
                {lProd ? <LR cols={3} /> : !(prodVendidos ?? []).length ? <ER cols={3} /> : prodVendidos!.map((p) => (
                  <TableRow key={p.produto_id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-right">{p.qtd}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(p.receita)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>
            <TabsContent value="menos">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Receita</TableHead>
              </TableRow></TableHeader><TableBody>
                {lProd ? <LR cols={3} /> : !(prodVendidos ?? []).length ? <ER cols={3} /> : [...(prodVendidos ?? [])].reverse().map((p) => (
                  <TableRow key={p.produto_id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-right">{p.qtd}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(p.receita)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ═══ ESTOQUE ═══ */}
        <TabsContent value="estoque" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV((estoque ?? []).map((e: any) => ({
              Produto: e.produtos?.nome ?? "", Código: e.produtos?.codigo ?? "",
              Quantidade: e.quantidade,
            })), "estoque")}
            onPDF={() => doExportPDF("Relatório de Estoque",
              ["Produto", "Código", "Quantidade"],
              (estoque ?? []).map((e: any) => [e.produtos?.nome ?? "", e.produtos?.codigo ?? "", String(e.quantidade)])
            )}
          />
          <Tabs defaultValue="atual">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="atual" className="text-xs">Estoque Atual</TabsTrigger>
              <TabsTrigger value="movimentacao" className="text-xs">Movimentação</TabsTrigger>
            </TabsList>
            <TabsContent value="atual">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Produto</TableHead><TableHead>Código</TableHead><TableHead className="text-right">Quantidade</TableHead>
              </TableRow></TableHeader><TableBody>
                {lEst ? <LR cols={3} /> : !(estoque ?? []).length ? <ER cols={3} /> : estoque!.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.produtos?.nome ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.produtos?.codigo ?? ""}</TableCell>
                    <TableCell className={cn("text-right font-semibold", Number(e.quantidade) <= 5 && "text-destructive")}>{e.quantidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>
            <TabsContent value="movimentacao">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead><TableHead>Obs</TableHead>
              </TableRow></TableHeader><TableBody>
                {lMov ? <LR cols={5} /> : !(movimentos ?? []).length ? <ER cols={5} /> : movimentos!.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{format(new Date(m.data), "dd/MM/yy HH:mm")}</TableCell>
                    <TableCell className="font-medium">{m.produtos?.nome ?? "—"}</TableCell>
                    <TableCell><Badge variant={m.tipo === "reposicao" ? "default" : m.tipo === "dano" ? "destructive" : "secondary"}>{m.tipo}</Badge></TableCell>
                    <TableCell className="text-right">{m.quantidade}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">{m.observacoes}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ═══ FINANCEIRO ═══ */}
        <TabsContent value="financeiro" className="space-y-4">
          <ExportBar
            onPDF={() => doExportPDF("Resumo Financeiro",
              ["Indicador", "Valor"],
              [
                ["Total Vendido", fmtR(totalVendas)],
                ["Total Recebido", fmtR(totalPgtos)],
                ["Total Pendente", fmtR(totalPendente)],
                ["Total Vencido", fmtR(totalVencido)],
                ["Saldo em Aberto", fmtR(totalPendente + totalVencido)],
              ]
            )}
            onCSV={() => doExportCSV([
              { Indicador: "Total Vendido", Valor: totalVendas },
              { Indicador: "Total Recebido", Valor: totalPgtos },
              { Indicador: "Total Pendente", Valor: totalPendente },
              { Indicador: "Total Vencido", Valor: totalVencido },
            ], "financeiro")}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4"><p className="text-xs text-muted-foreground">Total Vendido</p><p className="text-lg font-bold">{fmtR(totalVendas)}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Total Recebido</p><p className="text-lg font-bold text-primary">{fmtR(totalPgtos)}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Pendente</p><p className="text-lg font-bold text-yellow-600">{fmtR(totalPendente)}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Vencido</p><p className="text-lg font-bold text-destructive">{fmtR(totalVencido)}</p></Card>
          </div>
          {pgtosPorForma.length > 0 && (
            <Card className="p-4 flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pgtosPorForma} dataKey="valor" nameKey="forma" cx="50%" cy="50%" outerRadius={90} label={({ forma, valor }) => `${forma}: ${fmtR(valor)}`}>
                    {pgtosPorForma.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend /><Tooltip formatter={(v: number) => fmtR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </TabsContent>

        {/* ═══ PARCELAS ═══ */}
        <TabsContent value="parcelas" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV((todasParcelas ?? []).map((p: any) => ({
              Número: p.numero, Cliente: p.clientes?.nome ?? "—", Vencimento: p.vencimento,
              Valor: p.valor_total, Pago: p.valor_pago, Saldo: p.saldo, Status: p.status,
            })), "parcelas")}
            onPDF={() => doExportPDF("Relatório de Parcelas",
              ["Nº", "Cliente", "Vencimento", "Valor", "Pago", "Saldo", "Status"],
              (todasParcelas ?? []).map((p: any) => [
                String(p.numero), p.clientes?.nome ?? "—", format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy"),
                fmtR(Number(p.valor_total)), fmtR(Number(p.valor_pago)), fmtR(Number(p.saldo ?? 0)), p.status,
              ])
            )}
          />
          <Tabs defaultValue="todas">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="todas" className="text-xs">Todas</TabsTrigger>
              <TabsTrigger value="pendentes" className="text-xs">Pendentes</TabsTrigger>
              <TabsTrigger value="vencidas" className="text-xs">Vencidas</TabsTrigger>
              <TabsTrigger value="pagas" className="text-xs">Pagas</TabsTrigger>
              <TabsTrigger value="por_cliente" className="text-xs">Por Cliente</TabsTrigger>
            </TabsList>

            <TabsContent value="todas">
              <ParcelasTable data={todasParcelas ?? []} loading={lTP} />
            </TabsContent>
            <TabsContent value="pendentes">
              <ParcelasTable data={(todasParcelas ?? []).filter((p) => p.status === "pendente")} loading={lTP} />
            </TabsContent>
            <TabsContent value="vencidas">
              <ParcelasTable data={vencidas ?? []} loading={lVenc} />
            </TabsContent>
            <TabsContent value="pagas">
              <ParcelasTable data={(todasParcelas ?? []).filter((p) => p.status === "paga")} loading={lTP} />
            </TabsContent>
            <TabsContent value="por_cliente">
              <div className="space-y-3">
                {lPC ? <Card className="p-8 text-center text-muted-foreground">Carregando...</Card> : (parcelasPorCliente ?? []).map((c) => (
                  <Card key={c.cliente_id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <p className="font-semibold">{c.nome}</p>
                      <div className="flex gap-3 text-xs">
                        <span>Comprado: <strong>{fmtR(c.total_comprado)}</strong></span>
                        <span className="text-primary">Pago: <strong>{fmtR(c.total_pago)}</strong></span>
                        {c.total_pendente > 0 && <span className="text-yellow-600">Pendente: <strong>{fmtR(c.total_pendente)}</strong></span>}
                        {c.total_vencido > 0 && <span className="text-destructive">Vencido: <strong>{fmtR(c.total_vencido)}</strong></span>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => doExportPDF(
                      `Parcelas - ${c.nome}`,
                      ["Nº", "Vencimento", "Valor", "Pago", "Saldo", "Status"],
                      c.parcelas.map((p: any) => [
                        String(p.numero), format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy"),
                        fmtR(Number(p.valor_total)), fmtR(Number(p.valor_pago)), fmtR(Number(p.saldo ?? 0)), p.status,
                      ]),
                      ["TOTAL", "", fmtR(c.total_comprado), fmtR(c.total_pago), fmtR(c.total_pendente + c.total_vencido), ""]
                    )}>
                      <FileDown className="h-3 w-3 mr-1" /> PDF do Cliente
                    </Button>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ═══ RECEBIMENTOS ═══ */}
        <TabsContent value="recebimentos" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV((pgtos ?? []).map((p) => ({
              Data: format(new Date(p.data_pagamento), "dd/MM/yyyy HH:mm"),
              Forma: p.forma_pagamento, Valor: p.valor_pago,
            })), "recebimentos")}
            onPDF={() => doExportPDF("Relatório de Recebimentos",
              ["Data", "Forma de Pagamento", "Valor"],
              (pgtos ?? []).map((p) => [
                format(new Date(p.data_pagamento), "dd/MM/yyyy HH:mm"),
                p.forma_pagamento.replace(/_/g, " "), fmtR(Number(p.valor_pago)),
              ]),
              ["TOTAL", "", fmtR(totalPgtos)]
            )}
          />
          {pgtosPorForma.length > 0 && (
            <Card className="p-4 flex justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pgtosPorForma} dataKey="valor" nameKey="forma" cx="50%" cy="50%" outerRadius={80} label>
                    {pgtosPorForma.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend /><Tooltip formatter={(v: number) => fmtR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
          <Card><Table><TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead>
          </TableRow></TableHeader><TableBody>
            {lPgtos ? <LR cols={3} /> : !(pgtos ?? []).length ? <ER cols={3} /> : pgtos!.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{format(new Date(p.data_pagamento), "dd/MM/yy HH:mm")}</TableCell>
                <TableCell className="capitalize">{p.forma_pagamento.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right font-semibold">{fmtR(Number(p.valor_pago))}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></Card>
        </TabsContent>

        {/* ═══ LUCRO ═══ */}
        <TabsContent value="lucro" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV((lucros ?? []).map((l) => ({
              Produto: l.nome, Qtd: l.qtd, Receita: l.receita, Custo: l.custo, Lucro: l.lucro, Margem: l.margem.toFixed(1) + "%",
            })), "lucro")}
            onPDF={() => doExportPDF("Relatório de Lucro por Produto",
              ["Produto", "Qtd", "Receita", "Custo", "Lucro", "Margem"],
              (lucros ?? []).map((l) => [l.nome, String(l.qtd), fmtR(l.receita), fmtR(l.custo), fmtR(l.lucro), l.margem.toFixed(1) + "%"]),
              ["TOTAL", "", fmtR((lucros ?? []).reduce((s, l) => s + l.receita, 0)), fmtR((lucros ?? []).reduce((s, l) => s + l.custo, 0)), fmtR((lucros ?? []).reduce((s, l) => s + l.lucro, 0)), ""]
            )}
          />
          {lucros && lucros.length > 0 && (
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <ReBarChart data={lucros.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="nome" className="text-xs" angle={-20} textAnchor="end" height={60} />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => fmtR(v)} />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo" name="Custo" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--chart-3, 150 60% 45%))" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </Card>
          )}
          <Card><Table><TableHeader><TableRow>
            <TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead><TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Lucro</TableHead><TableHead className="text-right">Margem</TableHead>
          </TableRow></TableHeader><TableBody>
            {lLucro ? <LR cols={6} /> : !(lucros ?? []).length ? <ER cols={6} /> : lucros!.map((l) => (
              <TableRow key={l.produto_id}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell className="text-right">{l.qtd}</TableCell>
                <TableCell className="text-right">{fmtR(l.receita)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmtR(l.custo)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{fmtR(l.lucro)}</TableCell>
                <TableCell className="text-right">{l.margem.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></Card>
        </TabsContent>

        {/* ═══ VENDEDORES ═══ */}
        <TabsContent value="vendedores" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV(vendasPorVendedor.map((v) => ({ Vendedor: v.nome, Vendas: v.qtd, Total: v.total })), "vendedores")}
            onPDF={() => doExportPDF("Relatório de Vendedores",
              ["Vendedor", "Vendas", "Total", "Desconto"],
              vendasPorVendedor.map((v) => [v.nome, String(v.qtd), fmtR(v.total), fmtR(v.desconto)])
            )}
          />
          <Card><Table><TableHeader><TableRow>
            <TableHead>Vendedor</TableHead><TableHead className="text-right">Vendas</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Desconto</TableHead>
          </TableRow></TableHeader><TableBody>
            {vendasPorVendedor.map((v) => (
              <TableRow key={v.nome}>
                <TableCell className="font-medium">{v.nome}</TableCell>
                <TableCell className="text-right">{v.qtd}</TableCell>
                <TableCell className="text-right font-semibold">{fmtR(v.total)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmtR(v.desconto)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></Card>

          {/* Metas */}
          {metas && metas.length > 0 && (
            <Card className="p-4 space-y-3">
              <p className="font-semibold text-sm">Metas do Mês Atual</p>
              {metas.map((m) => {
                const vendido = vendasPorVendedor.find((v) => vendedorMap.get(m.vendedor_id) === v.nome)?.total ?? 0;
                const pct = Number(m.meta_valor) > 0 ? (vendido / Number(m.meta_valor)) * 100 : 0;
                const comissao = vendido * (Number(m.percentual_comissao) / 100);
                return (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span>{vendedorMap.get(m.vendedor_id) ?? m.vendedor_id.slice(0, 8)}</span>
                    <div className="flex gap-3 text-xs">
                      <span>Meta: {fmtR(Number(m.meta_valor))}</span>
                      <span className={pct >= 100 ? "text-primary font-bold" : ""}>{pct.toFixed(0)}%</span>
                      <span className="text-muted-foreground">Comissão: {fmtR(comissao)}</span>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>

        {/* ═══ CLIENTES ═══ */}
        <TabsContent value="clientes" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV(vendasPorCliente.map((c) => ({ Cliente: c.nome, Vendas: c.qtd, Total: c.total })), "clientes")}
            onPDF={() => doExportPDF("Relatório de Clientes",
              ["Cliente", "Vendas", "Total"],
              vendasPorCliente.map((c) => [c.nome, String(c.qtd), fmtR(c.total)])
            )}
          />
          <Tabs defaultValue="top">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="top" className="text-xs">Mais Compram</TabsTrigger>
              <TabsTrigger value="inadimplentes" className="text-xs">Inadimplentes</TabsTrigger>
            </TabsList>
            <TabsContent value="top">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Cliente</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader><TableBody>
                {vendasPorCliente.map((c) => (
                  <TableRow key={c.nome}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-right">{c.qtd}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>
            <TabsContent value="inadimplentes">
              <Card><Table><TableHeader><TableRow>
                <TableHead>Cliente</TableHead><TableHead className="text-right">Comprado</TableHead>
                <TableHead className="text-right">Pago</TableHead><TableHead className="text-right">Vencido</TableHead>
              </TableRow></TableHeader><TableBody>
                {(parcelasPorCliente ?? []).filter((c) => c.total_vencido > 0).map((c) => (
                  <TableRow key={c.cliente_id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-right">{fmtR(c.total_comprado)}</TableCell>
                    <TableCell className="text-right text-primary">{fmtR(c.total_pago)}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{fmtR(c.total_vencido)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ═══ ROMANEIO ═══ */}
        <TabsContent value="romaneio" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV((romaneios ?? []).map((r: any) => ({
              Data: r.data, Vendedor: vendedorMap.get(r.vendedor_id) ?? "", Status: r.status,
              Valor: r.valor_total, Vendas: (r.romaneio_vendas ?? []).length,
            })), "romaneio")}
            onPDF={() => doExportPDF("Relatório de Romaneio",
              ["Data", "Vendedor", "Status", "Valor Total", "Vendas"],
              (romaneios ?? []).map((r: any) => [
                format(new Date(r.data + "T12:00:00"), "dd/MM/yyyy"),
                vendedorMap.get(r.vendedor_id) ?? "", r.status,
                fmtR(Number(r.valor_total)), String((r.romaneio_vendas ?? []).length),
              ])
            )}
          />
          <Card><Table><TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Vendedor</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Vendas</TableHead>
          </TableRow></TableHeader><TableBody>
            {lRom ? <LR cols={5} /> : !(romaneios ?? []).length ? <ER cols={5} /> : romaneios!.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{format(new Date(r.data + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                <TableCell>{vendedorMap.get(r.vendedor_id) ?? "—"}</TableCell>
                <TableCell><Badge variant={r.status === "finalizado" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-right font-semibold">{fmtR(Number(r.valor_total))}</TableCell>
                <TableCell className="text-right">{(r.romaneio_vendas ?? []).length}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></Card>
        </TabsContent>

        {/* ═══ ABC ═══ */}
        <TabsContent value="abc" className="space-y-4">
          <ExportBar
            onCSV={() => doExportCSV((curvaABC ?? []).map((c) => ({
              Classe: c.classe, Produto: c.nome, Receita: c.receita, "%": c.pct.toFixed(1), "% Acum.": c.pctAcumulado.toFixed(1),
            })), "curva_abc")}
            onPDF={() => doExportPDF("Curva ABC de Produtos",
              ["Classe", "Produto", "Receita", "%", "% Acumulado"],
              (curvaABC ?? []).map((c) => [c.classe, c.nome, fmtR(c.receita), c.pct.toFixed(1) + "%", c.pctAcumulado.toFixed(1) + "%"])
            )}
          />
          <Card><Table><TableHeader><TableRow>
            <TableHead>Classe</TableHead><TableHead>Produto</TableHead>
            <TableHead className="text-right">Receita</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">% Acum.</TableHead>
          </TableRow></TableHeader><TableBody>
            {lABC ? <LR cols={5} /> : !(curvaABC ?? []).length ? <ER cols={5} /> : curvaABC!.map((item) => (
              <TableRow key={item.produto_id}>
                <TableCell><Badge style={{ backgroundColor: ABC_COLORS[item.classe] }} className="text-white font-bold">{item.classe}</Badge></TableCell>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-right">{fmtR(item.receita)}</TableCell>
                <TableCell className="text-right">{item.pct.toFixed(1)}%</TableCell>
                <TableCell className="text-right font-medium">{item.pctAcumulado.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></Card>
        </TabsContent>

        {/* ═══ PEDIDOS ═══ */}
        <TabsContent value="pedidos" className="space-y-4">
          <PedidosReportTab pedidos={pedidosRel} isLoading={lPed} vendedorMap={vendedorMap} doExportCSV={doExportCSV} doExportPDF={doExportPDF} />
        </TabsContent>

        {/* ═══ RANKING INDICAÇÕES ═══ */}
        <TabsContent value="ranking" className="space-y-4">
          <RankingIndicacoesTab doExportCSV={doExportCSV} doExportPDF={doExportPDF} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══ Sub-components ═══

function DatePicker({ label, date, onSelect }: { label: string; date: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", !date && "text-muted-foreground")}>
          <CalendarIcon className="w-3.5 h-3.5" />
          {label}: {format(date, "dd/MM/yy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

function ExportBar({ onCSV, onPDF }: { onCSV?: () => void; onPDF?: () => void }) {
  return (
    <div className="flex gap-2 justify-end flex-wrap">
      {onCSV && (
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={onCSV}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      )}
      {onPDF && (
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={onPDF}>
          <FileDown className="h-3.5 w-3.5" /> Gerar PDF
        </Button>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", color ?? "text-foreground")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function ParcelasTable({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card><Table><TableHeader><TableRow>
      <TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Vencimento</TableHead>
      <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead>Status</TableHead>
    </TableRow></TableHeader><TableBody>
      {loading ? <LR cols={6} /> : !data.length ? <ER cols={6} /> : data.map((p) => (
        <TableRow key={p.id}>
          <TableCell>{p.numero}ª</TableCell>
          <TableCell>{(p as any).clientes?.nome ?? "—"}</TableCell>
          <TableCell className="text-sm">{format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
          <TableCell className="text-right">{fmtR(Number(p.valor_total))}</TableCell>
          <TableCell className={cn("text-right font-semibold", p.status === "vencida" ? "text-destructive" : p.status === "paga" ? "text-primary" : "")}>
            {fmtR(Number(p.saldo ?? 0))}
          </TableCell>
          <TableCell>
            <Badge variant={p.status === "paga" ? "default" : p.status === "vencida" ? "destructive" : "secondary"}>
              {p.status}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </TableBody></Table></Card>
  );
}

function LR({ cols }: { cols: number }) {
  return <TableRow><TableCell colSpan={cols} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>;
}
function ER({ cols, msg }: { cols: number; msg?: string }) {
  return <TableRow><TableCell colSpan={cols} className="text-center text-muted-foreground py-8">{msg ?? "Sem dados no período"}</TableCell></TableRow>;
}

function RankingIndicacoesTab({ doExportCSV, doExportPDF }: { doExportCSV: (rows: Record<string, any>[], name: string) => void; doExportPDF: (title: string, headers: string[], rows: string[][], totals?: string[]) => void }) {
  const { data: topIndicadores, isLoading } = useTopIndicadores();
  const { data: niveis } = useNiveisRecompensa();

  const getNivel = (pontos: number) => {
    if (!niveis?.length) return "—";
    const nivel = getNivelAtual(pontos, niveis);
    return nivel?.nome ?? "Sem nível";
  };

  const totalPontos = (topIndicadores ?? []).reduce((s, c) => s + c.pontos_indicacao, 0);

  return (
    <>
      <ExportBar
        onCSV={() => doExportCSV((topIndicadores ?? []).map((c) => ({
          Posição: (topIndicadores ?? []).indexOf(c) + 1,
          Cliente: c.nome,
          Pontos: c.pontos_indicacao,
          Nível: getNivel(c.pontos_indicacao),
          Telefone: c.telefone,
        })), "ranking_indicacoes")}
        onPDF={() => doExportPDF("Ranking de Indicações",
          ["#", "Cliente", "Pontos", "Nível"],
          (topIndicadores ?? []).map((c, i) => [
            `${i + 1}º`,
            c.nome,
            String(c.pontos_indicacao),
            getNivel(c.pontos_indicacao),
          ]),
          ["TOTAL", "", String(totalPontos), ""]
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard label="Total Indicadores" value={String((topIndicadores ?? []).length)} />
        <SummaryCard label="Total Pontos" value={String(totalPontos)} color="text-primary" />
        {niveis && niveis.length > 0 && (
          <SummaryCard
            label="Nível Mais Alto"
            value={niveis[niveis.length - 1]?.nome ?? "—"}
            sub={`${(topIndicadores ?? []).filter(c => {
              const n = getNivelAtual(c.pontos_indicacao, niveis);
              return n?.id === niveis[niveis.length - 1]?.id;
            }).length} cliente(s)`}
          />
        )}
      </div>

      <Card><Table><TableHeader><TableRow>
        <TableHead>#</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead>Telefone</TableHead>
        <TableHead>Nível</TableHead>
        <TableHead className="text-right">Pontos</TableHead>
      </TableRow></TableHeader><TableBody>
        {isLoading ? <LR cols={5} /> : !(topIndicadores ?? []).length ? <ER cols={5} msg="Nenhuma indicação registrada" /> :
          topIndicadores!.map((c, i) => {
            const nivel = niveis ? getNivelAtual(c.pontos_indicacao, niveis) : null;
            return (
              <TableRow key={c.id}>
                <TableCell className="font-bold text-muted-foreground">{i + 1}º</TableCell>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-sm">{c.telefone || "—"}</TableCell>
                <TableCell>
                  {nivel ? (
                    <Badge variant="outline" className="gap-1 text-xs" style={{ borderColor: nivel.cor, color: nivel.cor }}>
                      <Award className="w-3 h-3" /> {nivel.nome}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3 text-yellow-500" /> {c.pontos_indicacao}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody></Table></Card>
    </>
  );
}
