import { useState } from "react";
import { BarChart3, Calendar as CalendarIcon, TrendingUp, Package, CreditCard, AlertTriangle, DollarSign, BarChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import {
  useRelVendasPeriodo,
  useRelProdutosVendidos,
  useRelParcelasPagas,
  useRelParcelasVencidas,
  useRelLucroProduto,
  useRelCurvaABC,
} from "@/hooks/useRelatorios";

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

  const inicio = format(dateFrom, "yyyy-MM-dd");
  const fim = format(dateTo, "yyyy-MM-dd");

  const { data: vendas, isLoading: lVendas } = useRelVendasPeriodo(inicio, fim);
  const { data: prodVendidos, isLoading: lProd } = useRelProdutosVendidos(inicio, fim);
  const { data: pgtos, isLoading: lPgtos } = useRelParcelasPagas(inicio, fim);
  const { data: vencidas, isLoading: lVenc } = useRelParcelasVencidas();
  const { data: lucros, isLoading: lLucro } = useRelLucroProduto(inicio, fim);
  const { data: curvaABC, isLoading: lABC } = useRelCurvaABC(inicio, fim);

  const fmtR = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const totalVendas = vendas?.reduce((s, v) => s + Number(v.total), 0) ?? 0;
  const totalPgtos = pgtos?.reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;
  const totalVencido = vencidas?.reduce((s, p) => s + Number(p.saldo), 0) ?? 0;

  const vendasPorDia = (() => {
    const map = new Map<string, number>();
    vendas?.forEach((v) => {
      const dia = format(new Date(v.data_venda), "dd/MM");
      map.set(dia, (map.get(dia) ?? 0) + Number(v.total));
    });
    return Array.from(map.entries()).map(([dia, total]) => ({ dia, total }));
  })();

  const pgtosPorForma = (() => {
    const map = new Map<string, number>();
    pgtos?.forEach((p) => {
      const forma = p.forma_pagamento || "outro";
      map.set(forma, (map.get(forma) ?? 0) + Number(p.valor_pago));
    });
    return Array.from(map.entries()).map(([forma, valor]) => ({ forma: forma.replace("_", " "), valor }));
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Relatórios gerenciais</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <DatePicker label="De" date={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
          <DatePicker label="Até" date={dateTo} onSelect={(d) => d && setDateTo(d)} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Vendas</p>
          <p className="text-lg font-bold text-foreground">{vendas?.length ?? 0}</p>
          <p className="text-sm font-semibold text-primary">{fmtR(totalVendas)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Produtos vendidos</p>
          <p className="text-lg font-bold text-foreground">{prodVendidos?.reduce((s, p) => s + p.qtd, 0) ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-lg font-bold text-primary">{fmtR(totalPgtos)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Vencido</p>
          <p className="text-lg font-bold text-destructive">{fmtR(totalVencido)}</p>
        </Card>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="vendas" className="gap-1"><TrendingUp className="w-3.5 h-3.5" />Vendas</TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1"><Package className="w-3.5 h-3.5" />Produtos</TabsTrigger>
          <TabsTrigger value="pagas" className="gap-1"><CreditCard className="w-3.5 h-3.5" />Pagas</TabsTrigger>
          <TabsTrigger value="vencidas" className="gap-1"><AlertTriangle className="w-3.5 h-3.5" />Vencidas</TabsTrigger>
          <TabsTrigger value="lucro" className="gap-1"><DollarSign className="w-3.5 h-3.5" />Lucro</TabsTrigger>
          <TabsTrigger value="abc" className="gap-1"><BarChart className="w-3.5 h-3.5" />ABC</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lVendas ? <LoadingRow cols={3} /> : !vendas?.length ? <EmptyRow cols={3} /> : vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">{format(new Date(v.data_venda), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>{(v as any).clientes?.nome ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(Number(v.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lProd ? <LoadingRow cols={3} /> : !prodVendidos?.length ? <EmptyRow cols={3} /> : prodVendidos.map((p) => (
                  <TableRow key={p.produto_id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-right">{p.qtd}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(p.receita)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pagas" className="space-y-4">
          {pgtosPorForma.length > 0 && (
            <Card className="p-4 flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pgtosPorForma} dataKey="valor" nameKey="forma" cx="50%" cy="50%" outerRadius={90} label={({ forma, valor }) => `${forma}: ${fmtR(valor)}`}>
                    {pgtosPorForma.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => fmtR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lPgtos ? <LoadingRow cols={3} /> : !pgtos?.length ? <EmptyRow cols={3} /> : pgtos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.data_pagamento), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="capitalize">{p.forma_pagamento.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtR(Number(p.valor_pago))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="vencidas">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lVenc ? <LoadingRow cols={4} /> : !vencidas?.length ? <EmptyRow cols={4} msg="Nenhuma parcela vencida 🎉" /> : vencidas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.numero}ª</TableCell>
                    <TableCell>{(p as any).clientes?.nome ?? "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{fmtR(Number(p.saldo))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="lucro" className="space-y-4">
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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lLucro ? <LoadingRow cols={6} /> : !lucros?.length ? <EmptyRow cols={6} /> : lucros.map((l) => (
                  <TableRow key={l.produto_id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="text-right">{l.qtd}</TableCell>
                    <TableCell className="text-right">{fmtR(l.receita)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtR(l.custo)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmtR(l.lucro)}</TableCell>
                    <TableCell className="text-right">{l.margem.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="abc">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classe</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">% Acum.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lABC ? <LoadingRow cols={5} /> : !curvaABC?.length ? <EmptyRow cols={5} /> : curvaABC.map((item) => (
                  <TableRow key={item.produto_id}>
                    <TableCell>
                      <Badge style={{ backgroundColor: ABC_COLORS[item.classe] }} className="text-white font-bold">
                        {item.classe}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-right">{fmtR(item.receita)}</TableCell>
                    <TableCell className="text-right">{item.pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-medium">{item.pctAcumulado.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

function LoadingRow({ cols }: { cols: number }) {
  return <TableRow><TableCell colSpan={cols} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>;
}

function EmptyRow({ cols, msg }: { cols: number; msg?: string }) {
  return <TableRow><TableCell colSpan={cols} className="text-center text-muted-foreground py-8">{msg ?? "Sem dados no período"}</TableCell></TableRow>;
}
