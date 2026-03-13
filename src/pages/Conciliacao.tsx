import { useState } from "react";
import { ModulePage } from "@/components/layout/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  useConciliacaoHistorico,
  useConciliacaoItens,
  useExecutarConciliacao,
} from "@/hooks/useConciliacao";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ExternalLink,
  FileText,
  Download,
  Loader2,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  ok: { icon: CheckCircle2, label: "OK", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" },
  atencao: { icon: AlertTriangle, label: "Atenção", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  erro: { icon: XCircle, label: "Erro", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
};

const tipoLabels: Record<string, string> = {
  venda_sem_itens: "Venda sem itens",
  venda_total_divergente: "Total divergente",
  parcela_valor_divergente: "Parcela divergente",
  pagamento_excede_parcela: "Pagamento excedente",
  caixa_financeiro_divergente: "Caixa ≠ Financeiro",
};

const tabelaRoutes: Record<string, string> = {
  vendas: "/vendas",
  parcelas: "/financeiro",
  pagamentos: "/financeiro",
  caixa_diario: "/caixa",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ConciliacaoPage() {
  const [dataAnalise, setDataAnalise] = useState(format(new Date(), "yyyy-MM-dd"));
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: historico, isLoading } = useConciliacaoHistorico();
  const { data: itensDetail } = useConciliacaoItens(detailId);
  const executar = useExecutarConciliacao();
  const navigate = useNavigate();

  const handleExecutar = () => executar.mutate(dataAnalise);

  const lastResult = historico?.find((h: any) => h.data === dataAnalise);

  return (
    <ModulePage
      title="Conciliação Financeira"
      description="Verificação automática de consistência entre vendas, parcelas, pagamentos e caixa"
    >
      <Tabs defaultValue="executar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="executar">Executar</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ===== EXECUTAR ===== */}
        <TabsContent value="executar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conciliação do Dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="date"
                  value={dataAnalise}
                  onChange={(e) => setDataAnalise(e.target.value)}
                  className="sm:w-48"
                />
                <Button onClick={handleExecutar} disabled={executar.isPending}>
                  {executar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Executar Conciliação
                </Button>
              </div>

              {/* Latest result for selected date */}
              {lastResult && <ConciliacaoResumo data={lastResult} onDetail={() => setDetailId(lastResult.id)} />}

              {/* Inline result after execution */}
              {executar.data && executar.data.data === dataAnalise && (
                <div className="space-y-4">
                  <ConciliacaoResumo
                    data={{
                      ...executar.data,
                      id: executar.data.conciliacao_id,
                      total_divergencias: executar.data.divergencias.length,
                      valor_divergente: executar.data.divergencias.reduce((s: number, d: any) => s + d.diferenca, 0),
                    }}
                    onDetail={() => setDetailId(executar.data!.conciliacao_id)}
                  />

                  {executar.data.divergencias.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Divergências Encontradas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DivergenciaTable
                          items={executar.data.divergencias.map((d: any, i: number) => ({
                            id: `inline-${i}`,
                            ...d,
                          }))}
                          onNavigate={(tabela) => {
                            const route = tabelaRoutes[tabela];
                            if (route) navigate(route);
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTÓRICO ===== */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Conciliações</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !historico?.length ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Nenhuma conciliação realizada ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                        <TableHead className="text-right">Divergências</TableHead>
                        <TableHead className="text-right">Valor Div.</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historico.map((h: any) => {
                        const cfg = statusConfig[h.status as keyof typeof statusConfig] ?? statusConfig.ok;
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="font-medium">
                              {format(new Date(h.data + "T12:00:00"), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cfg.bg}>
                                <Icon className={`h-3 w-3 mr-1 ${cfg.color}`} />
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(h.total_vendas))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(h.total_recebido))}</TableCell>
                            <TableCell className="text-right">{h.total_divergencias}</TableCell>
                            <TableCell className="text-right">
                              {Number(h.valor_divergente) > 0 ? formatCurrency(Number(h.valor_divergente)) : "—"}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => setDetailId(h.id)}>
                                <Search className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Conciliação</DialogTitle>
          </DialogHeader>
          {itensDetail && itensDetail.length > 0 ? (
            <DivergenciaTable
              items={itensDetail}
              onNavigate={(tabela) => {
                const route = tabelaRoutes[tabela];
                if (route) {
                  setDetailId(null);
                  navigate(route);
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-muted-foreground">Nenhuma divergência encontrada nesta conciliação.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

// ===== Sub-components =====

function ConciliacaoResumo({ data, onDetail }: { data: any; onDetail: () => void }) {
  const cfg = statusConfig[data.status as keyof typeof statusConfig] ?? statusConfig.ok;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-4 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${cfg.color}`} />
          <span className="font-semibold">{cfg.label}</span>
          {data.total_divergencias > 0 && (
            <Badge variant="secondary">{data.total_divergencias} divergência(s)</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onDetail}>
          <FileText className="h-4 w-4 mr-1" /> Detalhes
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Vendas</p>
          <p className="font-semibold">{formatCurrency(Number(data.total_vendas))}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Recebido</p>
          <p className="font-semibold">{formatCurrency(Number(data.total_recebido))}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Crediário</p>
          <p className="font-semibold">{formatCurrency(Number(data.total_crediario))}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Parcelas Geradas</p>
          <p className="font-semibold">{formatCurrency(Number(data.total_parcelas_geradas))}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Pagamentos</p>
          <p className="font-semibold">{formatCurrency(Number(data.total_pagamentos))}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Saldo Caixa</p>
          <p className="font-semibold">{formatCurrency(Number(data.saldo_caixa))}</p>
        </div>
      </div>
    </div>
  );
}

function DivergenciaTable({
  items,
  onNavigate,
}: {
  items: any[];
  onNavigate: (tabela: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Esperado</TableHead>
            <TableHead className="text-right">Encontrado</TableHead>
            <TableHead className="text-right">Diferença</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell>
                <span className="text-sm font-medium">
                  {tipoLabels[item.tipo] ?? item.tipo}
                </span>
                <p className="text-xs text-muted-foreground">{item.descricao}</p>
              </TableCell>
              <TableCell className="text-sm">{item.cliente_nome || "—"}</TableCell>
              <TableCell className="text-right text-sm">
                {formatCurrency(Number(item.valor_esperado))}
              </TableCell>
              <TableCell className="text-right text-sm">
                {formatCurrency(Number(item.valor_encontrado))}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold text-destructive">
                {formatCurrency(Number(item.diferenca))}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onNavigate(item.tabela)}
                  title="Abrir registro"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
