import { useState } from "react";
import { ModulePage } from "@/components/layout/ModulePage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCaixaAberto,
  useCaixaHistorico,
  useCaixaMovimentacoes,
  useAbrirCaixa,
  useRegistrarMovimentacao,
  useFecharCaixa,
  useReabrirCaixa,
  type CaixaDiario,
} from "@/hooks/useCaixa";
import { useAuth } from "@/contexts/AuthContext";
import { exportCSV, exportPDF, fmtR } from "@/lib/reportExport";
import { format } from "date-fns";
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  Plus,
  Minus,
  History,
  FileText,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

const TIPO_LABELS: Record<string, string> = {
  entrada_venda: "Venda",
  entrada_recebimento: "Recebimento",
  sangria: "Sangria",
  suprimento: "Suprimento",
  ajuste_manual_entrada: "Ajuste (+)",
  ajuste_manual_saida: "Ajuste (−)",
};

export default function CaixaPage() {
  const { profile, isAdmin } = useAuth();
  const { data: caixaAberto, isLoading } = useCaixaAberto();
  const { data: historico } = useCaixaHistorico();
  const { data: movimentacoes } = useCaixaMovimentacoes(caixaAberto?.id);
  const abrirCaixa = useAbrirCaixa();
  const registrarMov = useRegistrarMovimentacao();
  const fecharCaixa = useFecharCaixa();
  const reabrirCaixa = useReabrirCaixa();

  const [tab, setTab] = useState("caixa");
  const [openAbertura, setOpenAbertura] = useState(false);
  const [openMov, setOpenMov] = useState(false);
  const [openFechamento, setOpenFechamento] = useState(false);
  const [openDetalhe, setOpenDetalhe] = useState<CaixaDiario | null>(null);

  // Abertura form
  const [valorInicial, setValorInicial] = useState("");
  const [obsAbertura, setObsAbertura] = useState("");

  // Movimentação form
  const [movTipo, setMovTipo] = useState("sangria");
  const [movValor, setMovValor] = useState("");
  const [movDesc, setMovDesc] = useState("");

  // Fechamento form
  const [valorContado, setValorContado] = useState("");
  const [obsFechamento, setObsFechamento] = useState("");

  // Filtros do histórico
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const handleAbrir = () => {
    const v = parseFloat(valorInicial);
    if (isNaN(v) || v < 0) { toast.error("Informe um valor inicial válido"); return; }
    abrirCaixa.mutate({ valor_inicial: v, observacao: obsAbertura }, {
      onSuccess: () => { setOpenAbertura(false); setValorInicial(""); setObsAbertura(""); }
    });
  };

  const handleMov = () => {
    if (!caixaAberto) return;
    const v = parseFloat(movValor);
    if (isNaN(v) || v <= 0) { toast.error("Informe um valor válido"); return; }
    if (!movDesc.trim()) { toast.error("Informe uma descrição"); return; }
    registrarMov.mutate({ caixa_id: caixaAberto.id, tipo: movTipo, valor: v, descricao: movDesc }, {
      onSuccess: () => {
        setOpenMov(false); setMovValor(""); setMovDesc("");
        toast.success(movTipo === "sangria" ? "Sangria registrada" : movTipo === "suprimento" ? "Suprimento registrado" : "Movimentação registrada");
      }
    });
  };

  const handleFechar = () => {
    if (!caixaAberto) return;
    const v = parseFloat(valorContado);
    if (isNaN(v) || v < 0) { toast.error("Informe o valor contado no caixa"); return; }
    fecharCaixa.mutate({ caixa_id: caixaAberto.id, valor_contado: v, observacao: obsFechamento }, {
      onSuccess: () => { setOpenFechamento(false); setValorContado(""); setObsFechamento(""); }
    });
  };

  const handleExportCSV = () => {
    if (!historico?.length) return;
    exportCSV(historico.map(c => ({
      Data: c.data,
      Status: c.status,
      "Valor Inicial": c.valor_inicial,
      Entradas: c.total_entradas,
      Sangrias: c.total_sangrias,
      Suprimentos: c.total_suprimentos,
      "Saldo Teórico": c.saldo_teorico,
      "Valor Contado": c.valor_contado ?? "",
      Diferença: c.diferenca ?? "",
    })), "caixa-historico");
  };

  const handleExportPDF = () => {
    if (!historico?.length) return;
    exportPDF({
      title: "Histórico de Caixa",
      headers: ["Data", "Status", "Inicial", "Entradas", "Sangrias", "Teórico", "Contado", "Diferença"],
      rows: historico.map(c => [
        c.data, c.status, fmtR(c.valor_inicial), fmtR(c.total_entradas),
        fmtR(c.total_sangrias), fmtR(c.saldo_teorico),
        c.valor_contado != null ? fmtR(c.valor_contado) : "–",
        c.diferenca != null ? fmtR(c.diferenca) : "–",
      ]),
    });
  };

  const historicoFiltrado = historico?.filter(c =>
    filtroStatus === "todos" || c.status === filtroStatus
  ) ?? [];

  if (isLoading) return <ModulePage title="Caixa" description="Controle diário de caixa" icon={DollarSign}><p className="text-muted-foreground">Carregando...</p></ModulePage>;

  return (
    <ModulePage title="Caixa Diário" description="Controle de abertura, sangrias, suprimentos e fechamento" icon={DollarSign}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="caixa">Caixa Atual</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ───── Caixa Atual ───── */}
        <TabsContent value="caixa" className="space-y-4">
          {!caixaAberto ? (
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-4">
                <Lock className="w-10 h-10 text-muted-foreground" />
                <p className="text-muted-foreground text-center">Nenhum caixa aberto hoje.</p>
                <Button onClick={() => setOpenAbertura(true)} className="gap-2">
                  <Unlock className="w-4 h-4" /> Abrir Caixa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard label="Valor Inicial" value={fmtR(caixaAberto.valor_inicial)} icon={DollarSign} />
                <SummaryCard label="Entradas" value={fmtR(caixaAberto.total_entradas)} icon={ArrowDownCircle} color="text-emerald-500" />
                <SummaryCard label="Sangrias" value={fmtR(caixaAberto.total_sangrias)} icon={ArrowUpCircle} color="text-red-500" />
                <SummaryCard label="Saldo Teórico" value={fmtR(caixaAberto.saldo_teorico)} icon={DollarSign} color="text-primary" />
              </div>

              {/* Ações rápidas */}
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" className="gap-2" onClick={() => { setMovTipo("sangria"); setOpenMov(true); }}>
                  <Minus className="w-4 h-4" /> Sangria
                </Button>
                <Button variant="outline" className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={() => { setMovTipo("suprimento"); setOpenMov(true); }}>
                  <Plus className="w-4 h-4" /> Suprimento
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => { setMovTipo("ajuste_manual_entrada"); setOpenMov(true); }}>
                  Ajuste Manual
                </Button>
                <Button className="gap-2 ml-auto" onClick={() => { setValorContado(""); setOpenFechamento(true); }}>
                  <Lock className="w-4 h-4" /> Fechar Caixa
                </Button>
              </div>

              {/* Movimentações do dia */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Movimentações de Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  {!movimentacoes?.length ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma movimentação registrada</p>
                  ) : (
                    <div className="divide-y divide-border max-h-72 overflow-y-auto">
                      {movimentacoes.map((m) => (
                        <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <Badge variant={m.tipo.includes("sangria") || m.tipo.includes("saida") ? "destructive" : "secondary"} className="mr-2 text-[10px]">
                              {TIPO_LABELS[m.tipo] || m.tipo}
                            </Badge>
                            <span className="text-muted-foreground">{m.descricao}</span>
                          </div>
                          <span className={m.tipo.includes("sangria") || m.tipo.includes("saida") ? "text-red-500 font-medium" : "text-emerald-500 font-medium"}>
                            {m.tipo.includes("sangria") || m.tipo.includes("saida") ? "−" : "+"} {fmtR(m.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ───── Histórico ───── */}
        <TabsContent value="historico" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}><FileText className="w-4 h-4 mr-1" />CSV</Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-1" />PDF</Button>
            </div>
          </div>

          <div className="space-y-2">
            {!historicoFiltrado.length ? (
              <p className="text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
            ) : historicoFiltrado.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setOpenDetalhe(c)}>
                <CardContent className="py-3 px-4 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant={c.status === "aberto" ? "secondary" : "outline"}>
                      {c.status === "aberto" ? "Aberto" : "Fechado"}
                    </Badge>
                    <span className="font-medium text-sm">{format(new Date(c.data + "T12:00:00"), "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Inicial: {fmtR(c.valor_inicial)}</span>
                    <span>Teórico: {fmtR(c.saldo_teorico)}</span>
                    {c.diferenca != null && (
                      <span className={c.diferenca < 0 ? "text-red-500" : c.diferenca > 0 ? "text-emerald-500" : ""}>
                        Dif: {fmtR(c.diferenca)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ───── Dialog: Abertura ───── */}
      <Dialog open={openAbertura} onOpenChange={setOpenAbertura}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Valor Inicial (R$)</label>
              <Input type="number" min="0" step="0.01" value={valorInicial} onChange={e => setValorInicial(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="text-sm font-medium">Observação</label>
              <Textarea value={obsAbertura} onChange={e => setObsAbertura(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAbrir} disabled={abrirCaixa.isPending} className="w-full gap-2">
              <Unlock className="w-4 h-4" /> Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Dialog: Movimentação (Sangria/Suprimento/Ajuste) ───── */}
      <Dialog open={openMov} onOpenChange={setOpenMov}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {movTipo === "sangria" ? "Registrar Sangria" : movTipo === "suprimento" ? "Registrar Suprimento" : "Ajuste Manual"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {movTipo.startsWith("ajuste") && (
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={movTipo} onValueChange={setMovTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ajuste_manual_entrada">Ajuste (+)</SelectItem>
                    <SelectItem value="ajuste_manual_saida">Ajuste (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input type="number" min="0.01" step="0.01" value={movValor} onChange={e => setMovValor(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição / Motivo</label>
              <Textarea value={movDesc} onChange={e => setMovDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleMov} disabled={registrarMov.isPending} className="w-full">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Dialog: Fechamento ───── */}
      <Dialog open={openFechamento} onOpenChange={setOpenFechamento}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          {caixaAberto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Valor Inicial:</span><p className="font-medium">{fmtR(caixaAberto.valor_inicial)}</p></div>
                <div><span className="text-muted-foreground">Entradas:</span><p className="font-medium text-emerald-500">{fmtR(caixaAberto.total_entradas)}</p></div>
                <div><span className="text-muted-foreground">Sangrias:</span><p className="font-medium text-red-500">{fmtR(caixaAberto.total_sangrias)}</p></div>
                <div><span className="text-muted-foreground">Saldo Teórico:</span><p className="font-bold text-primary">{fmtR(caixaAberto.saldo_teorico)}</p></div>
              </div>
              <div>
                <label className="text-sm font-medium">Valor Contado no Caixa (R$)</label>
                <Input type="number" min="0" step="0.01" value={valorContado} onChange={e => setValorContado(e.target.value)} placeholder="0,00" className="text-lg" />
              </div>
              {valorContado && !isNaN(parseFloat(valorContado)) && (
                <div className="p-3 rounded-md bg-muted text-center">
                  <span className="text-sm text-muted-foreground">Diferença: </span>
                  <span className={`text-lg font-bold ${parseFloat(valorContado) - caixaAberto.saldo_teorico < 0 ? "text-red-500" : parseFloat(valorContado) - caixaAberto.saldo_teorico > 0 ? "text-emerald-500" : "text-foreground"}`}>
                    {fmtR(parseFloat(valorContado) - caixaAberto.saldo_teorico)}
                  </span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Observação</label>
                <Textarea value={obsFechamento} onChange={e => setObsFechamento(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleFechar} disabled={fecharCaixa.isPending} className="w-full gap-2">
              <Lock className="w-4 h-4" /> Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Dialog: Detalhe do Histórico ───── */}
      <Dialog open={!!openDetalhe} onOpenChange={() => setOpenDetalhe(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Caixa</DialogTitle></DialogHeader>
          {openDetalhe && (
            <CaixaDetalhe caixa={openDetalhe} isAdmin={isAdmin} onReabrir={() => {
              reabrirCaixa.mutate(openDetalhe.id, { onSuccess: () => setOpenDetalhe(null) });
            }} />
          )}
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 shrink-0 ${color || "text-muted-foreground"}`} />
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CaixaDetalhe({ caixa, isAdmin, onReabrir }: { caixa: CaixaDiario; isAdmin: boolean; onReabrir: () => void }) {
  const { data: movs } = useCaixaMovimentacoes(caixa.id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Data:</span><p className="font-medium">{format(new Date(caixa.data + "T12:00:00"), "dd/MM/yyyy")}</p></div>
        <div><span className="text-muted-foreground">Status:</span><p><Badge variant={caixa.status === "aberto" ? "secondary" : "outline"}>{caixa.status}</Badge></p></div>
        <div><span className="text-muted-foreground">Inicial:</span><p className="font-medium">{fmtR(caixa.valor_inicial)}</p></div>
        <div><span className="text-muted-foreground">Entradas:</span><p className="font-medium text-emerald-500">{fmtR(caixa.total_entradas)}</p></div>
        <div><span className="text-muted-foreground">Sangrias:</span><p className="font-medium text-red-500">{fmtR(caixa.total_sangrias)}</p></div>
        <div><span className="text-muted-foreground">Saldo Teórico:</span><p className="font-bold">{fmtR(caixa.saldo_teorico)}</p></div>
        {caixa.valor_contado != null && (
          <>
            <div><span className="text-muted-foreground">Contado:</span><p className="font-medium">{fmtR(caixa.valor_contado)}</p></div>
            <div><span className="text-muted-foreground">Diferença:</span>
              <p className={`font-bold ${(caixa.diferenca ?? 0) < 0 ? "text-red-500" : (caixa.diferenca ?? 0) > 0 ? "text-emerald-500" : ""}`}>
                {fmtR(caixa.diferenca ?? 0)}
              </p>
            </div>
          </>
        )}
      </div>
      {caixa.observacao_abertura && <p className="text-xs text-muted-foreground">Obs. abertura: {caixa.observacao_abertura}</p>}
      {caixa.observacao_fechamento && <p className="text-xs text-muted-foreground">Obs. fechamento: {caixa.observacao_fechamento}</p>}

      {movs && movs.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1">Movimentações ({movs.length})</p>
          <div className="divide-y divide-border max-h-48 overflow-y-auto text-xs">
            {movs.map(m => (
              <div key={m.id} className="flex justify-between py-1.5">
                <div className="flex items-center gap-1">
                  <Badge variant={m.tipo.includes("sangria") || m.tipo.includes("saida") ? "destructive" : "secondary"} className="text-[9px]">
                    {TIPO_LABELS[m.tipo] || m.tipo}
                  </Badge>
                  <span className="text-muted-foreground">{m.descricao}</span>
                </div>
                <span className="font-medium">{fmtR(m.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && caixa.status === "fechado" && (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={onReabrir}>
          <RotateCcw className="w-4 h-4" /> Reabrir Caixa (Admin)
        </Button>
      )}
    </div>
  );
}
