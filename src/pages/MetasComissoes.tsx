import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Trophy, DollarSign, TrendingUp, Save, Users } from "lucide-react";
import { useVendedorDashboard, useRankingVendedores, useMetas, useUpsertMeta } from "@/hooks/useMetasComissoes";
import { useAuth } from "@/contexts/AuthContext";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function MetasComissoesPage() {
  const { profile } = useAuth();
  const { data: dashboard, isLoading: loadDash } = useVendedorDashboard();
  const { data: ranking } = useRankingVendedores();
  const { data: metas } = useMetas();
  const upsertMeta = useUpsertMeta();
  const { isAdmin, isGerente } = useAuth();

  const [editMeta, setEditMeta] = useState<{ vendedorId: string; valor: string; comissao: string } | null>(null);

  const now = new Date();
  const mesNome = now.toLocaleString("pt-BR", { month: "long" });

  const handleSaveMeta = () => {
    if (!editMeta || !profile) return;
    upsertMeta.mutate({
      empresa_id: profile.empresa_id,
      vendedor_id: editMeta.vendedorId,
      mes: now.getMonth() + 1,
      ano: now.getFullYear(),
      meta_valor: parseFloat(editMeta.valor) || 0,
      percentual_comissao: parseFloat(editMeta.comissao) || 5,
    });
    setEditMeta(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" /> Metas & Comissões
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{mesNome} {now.getFullYear()}</p>
      </div>

      {/* Painel do vendedor */}
      {dashboard && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Meu Desempenho</h2>
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{fmt(dashboard.totalDia)}</p>
                <p className="text-[11px] text-muted-foreground">{dashboard.vendasDia} vendas hoje</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{fmt(dashboard.totalMes)}</p>
                <p className="text-[11px] text-muted-foreground">{dashboard.vendasMes} vendas no mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Meta progress */}
          {dashboard.metaValor > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Meta Mensal</span>
                  <Badge variant={dashboard.percentualMeta >= 100 ? "default" : "secondary"}>
                    {dashboard.percentualMeta}%
                  </Badge>
                </div>
                <Progress value={Math.min(dashboard.percentualMeta, 100)} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmt(dashboard.totalMes)}</span>
                  <span>{fmt(dashboard.metaValor)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comissão Acumulada</p>
                  <p className="text-2xl font-bold text-primary">{fmt(dashboard.comissaoAcumulada)}</p>
                </div>
                <Badge variant="outline">{dashboard.percentualComissao}%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking */}
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" /> Ranking de Vendedores
        </h2>
        <div className="space-y-2">
          {(ranking || []).map((r, i) => (
            <Card key={r.vendedorId}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    i === 0 ? "bg-yellow-500/20 text-yellow-600" : i === 1 ? "bg-gray-300/30 text-gray-600" : i === 2 ? "bg-orange-400/20 text-orange-600" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}º
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">{r.qtdVendas} vendas</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-foreground text-sm">{fmt(r.totalVendas)}</p>
                    {r.metaValor > 0 && (
                      <p className="text-[11px] text-muted-foreground">{r.percentualMeta}% da meta</p>
                    )}
                  </div>
                  {(isAdmin || isGerente) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() =>
                        setEditMeta({
                          vendedorId: r.vendedorId,
                          valor: String(r.metaValor || ""),
                          comissao: "5",
                        })
                      }
                    >
                      <Target className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!ranking || ranking.length === 0) && (
            <p className="text-center text-sm text-muted-foreground py-6">Nenhuma venda no mês</p>
          )}
        </div>
      </div>

      {/* Edit Meta Modal */}
      {editMeta && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Definir Meta</h3>
            <div>
              <label className="text-xs text-muted-foreground">Meta Mensal (R$)</label>
              <Input
                type="number"
                value={editMeta.valor}
                onChange={(e) => setEditMeta({ ...editMeta, valor: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Comissão (%)</label>
              <Input
                type="number"
                value={editMeta.comissao}
                onChange={(e) => setEditMeta({ ...editMeta, comissao: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveMeta} className="flex-1">
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
              <Button variant="outline" onClick={() => setEditMeta(null)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
