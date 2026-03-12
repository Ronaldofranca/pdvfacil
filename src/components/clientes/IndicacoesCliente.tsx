import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Star, Gift, Users, TrendingUp, Award } from "lucide-react";
import { useIndicacoesDoCliente, useResumoIndicacoes, useUsarPontos } from "@/hooks/useIndicacoes";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: any;
}

export function IndicacoesCliente({ open, onOpenChange, cliente }: Props) {
  const { profile } = useAuth();
  const { data: indicacoes, isLoading: loadInd } = useIndicacoesDoCliente(cliente?.id ?? null);
  const { data: resumo, isLoading: loadRes } = useResumoIndicacoes(cliente?.id ?? null);
  const usarPontos = useUsarPontos();

  const [pontosUsar, setPontosUsar] = useState("");
  const [tipoUso, setTipoUso] = useState<"desconto" | "brinde" | "credito">("desconto");
  const [descricaoUso, setDescricaoUso] = useState("");

  const handleUsarPontos = () => {
    if (!profile || !cliente) return;
    const pts = parseInt(pontosUsar);
    if (!pts || pts <= 0) return;
    usarPontos.mutate(
      {
        empresa_id: profile.empresa_id,
        cliente_id: cliente.id,
        pontos: pts,
        tipo: tipoUso,
        descricao: descricaoUso || `${tipoUso} via pontos`,
      },
      {
        onSuccess: () => {
          setPontosUsar("");
          setDescricaoUso("");
        },
      }
    );
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Indicações — {cliente.nome}
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{resumo?.qtdIndicados ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Indicados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Star className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
              <p className="text-lg font-bold text-foreground">{resumo?.pontosAcumulados ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Pts Acumulados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Gift className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{resumo?.pontosDisponiveis ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Disponíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Usar Pontos */}
        {(resumo?.pontosDisponiveis ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gift className="w-4 h-4" /> Usar Pontos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pontos</Label>
                  <Input
                    type="number"
                    min={1}
                    max={resumo?.pontosDisponiveis ?? 0}
                    value={pontosUsar}
                    onChange={(e) => setPontosUsar(e.target.value)}
                    placeholder={`Máx: ${resumo?.pontosDisponiveis ?? 0}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={tipoUso} onValueChange={(v) => setTipoUso(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desconto">Desconto</SelectItem>
                      <SelectItem value="brinde">Brinde</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={descricaoUso}
                  onChange={(e) => setDescricaoUso(e.target.value)}
                  placeholder="Ex: Desconto na venda #123"
                />
              </div>
              <Button size="sm" onClick={handleUsarPontos} disabled={usarPontos.isPending}>
                {usarPontos.isPending ? "Processando..." : "Usar Pontos"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Histórico de indicações */}
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Clientes Indicados
          </h3>
          {loadInd ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : !indicacoes?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma indicação registrada</p>
          ) : (
            <div className="space-y-2">
              {indicacoes.map((ind: any) => (
                <div key={ind.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {ind.clientes?.nome ?? "Cliente"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(ind.data_indicacao), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3" /> +{ind.pontos_gerados} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Histórico de uso de pontos */}
        {resumo && resumo.historicoPontos.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4" /> Pontos Utilizados
              </h3>
              <div className="space-y-2">
                {resumo.historicoPontos.map((uso: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{uso.descricao || uso.tipo}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(uso.created_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-destructive">
                      -{uso.pontos_usados} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
