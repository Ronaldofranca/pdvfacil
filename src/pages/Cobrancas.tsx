import { useState } from "react";
import {
  MessageSquare, Search, Filter, Phone, AlertTriangle, Clock, Calendar,
  CreditCard, ChevronDown, ChevronUp, Receipt, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientesCobranca, useRegistrarCobranca, useLembretesContagem, gerarMensagemParcela, gerarMensagemLembrete, gerarMensagemAgrupada, abrirWhatsApp, type FiltroCobranca, type ClienteCobranca, type ParcelaCobranca } from "@/hooks/useCobrancas";
import { useClienteScoreById } from "@/hooks/useClienteScore";
import { usePermissions } from "@/hooks/usePermissions";
import { PagamentoForm } from "@/components/financeiro/PagamentoForm";
import { ReciboParcela } from "@/components/financeiro/ReciboParcela";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function ClienteCard({
  cliente,
  onPagar,
  onRecibo,
  canPay,
  empresaId,
}: {
  cliente: ClienteCobranca;
  onPagar: (p: ParcelaCobranca) => void;
  onRecibo: (p: ParcelaCobranca) => void;
  canPay: boolean;
  empresaId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const registrar = useRegistrarCobranca();

  const cobrarIndividual = (p: ParcelaCobranca) => {
    const msg = gerarMensagemParcela(cliente.nome, p, cliente.totalSaldo);
    abrirWhatsApp(cliente.telefone, msg);
    registrar.mutate({
      empresa_id: empresaId,
      cliente_id: cliente.cliente_id,
      parcela_id: p.id,
      tipo_cobranca: "whatsapp",
      mensagem: msg,
    });
  };

  const cobrarAgrupado = () => {
    const msg = gerarMensagemAgrupada(cliente.nome, cliente.parcelas);
    abrirWhatsApp(cliente.telefone, msg);
    registrar.mutate({
      empresa_id: empresaId,
      cliente_id: cliente.cliente_id,
      tipo_cobranca: "whatsapp",
      mensagem: msg,
    });
  };

  return (
    <Card className="overflow-hidden">
      {/* Client header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{cliente.nome}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {cliente.telefone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {cliente.telefone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-destructive">{fmt(cliente.totalSaldo)}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="destructive" className="text-[10px]">
                {cliente.qtdParcelas} parcela{cliente.qtdParcelas > 1 ? "s" : ""}
              </Badge>
              {cliente.maiorAtraso > 0 && (
                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                  {cliente.maiorAtraso}d atraso
                </Badge>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t">
          {/* Grouped collection button */}
          {cliente.parcelas.length > 1 && cliente.telefone && (
            <div className="px-4 py-2 border-b bg-muted/30">
              <Button
                size="sm"
                className="w-full gap-2"
                variant="default"
                onClick={(e) => { e.stopPropagation(); cobrarAgrupado(); }}
              >
                <MessageSquare className="w-4 h-4" />
                Cobrar Todas no WhatsApp ({cliente.qtdParcelas} parcelas)
              </Button>
            </div>
          )}

          {/* Individual parcelas */}
          <div className="divide-y">
            {cliente.parcelas.map((p) => {
              const isVencida = p.status === "vencida";
              const dataVenc = format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
              return (
                <div key={p.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.numero}ª parcela</span>
                      <Badge
                        variant={isVencida ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {isVencida ? (
                          <><AlertTriangle className="w-3 h-3 mr-0.5" /> Vencida</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-0.5" /> {p.status === "parcial" ? "Parcial" : "Pendente"}</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {dataVenc}
                      </span>
                      <span>Saldo: <strong className="text-foreground">{fmt(Number(p.saldo))}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cliente.telefone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-9"
                        onClick={(e) => { e.stopPropagation(); cobrarIndividual(p); }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </Button>
                    )}
                    {canPay && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-9"
                        onClick={(e) => { e.stopPropagation(); onPagar(p); }}
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pagar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs h-9"
                      onClick={(e) => { e.stopPropagation(); onRecibo(p); }}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function CobrancasPage() {
  const { profile } = useAuth();
  const { canRegisterPagamento } = usePermissions();
  const [filtro, setFiltro] = useState<FiltroCobranca>("todas");
  const [search, setSearch] = useState("");
  const [pagamentoState, setPagamentoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [reciboState, setReciboState] = useState<{ open: boolean; data?: any }>({ open: false });

  const { clientes, isLoading } = useClientesCobranca(filtro);

  const filtered = clientes.filter(
    (c) => !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.telefone.includes(search)
  );

  const totalSaldo = filtered.reduce((s, c) => s + c.totalSaldo, 0);
  const totalParcelas = filtered.reduce((s, c) => s + c.qtdParcelas, 0);
  const clientesMultiplas = filtered.filter((c) => c.qtdParcelas >= 2).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
            <MessageSquare className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Central de Cobrança</h1>
            <p className="text-sm text-muted-foreground">Cobranças via WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Saldo em Aberto</p>
          <p className="text-lg font-bold text-destructive">{fmt(totalSaldo)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Parcelas</p>
          <p className="text-lg font-bold text-foreground">{totalParcelas}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Clientes</p>
          <p className="text-lg font-bold text-foreground">{filtered.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Múltiplas Parcelas</p>
          <p className="text-lg font-bold text-foreground">{clientesMultiplas}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar cliente ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as FiltroCobranca)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="todas" className="text-xs">Todas</TabsTrigger>
            <TabsTrigger value="vencidas" className="text-xs">Vencidas</TabsTrigger>
            <TabsTrigger value="vencendo_hoje" className="text-xs">Hoje</TabsTrigger>
            <TabsTrigger value="pendentes" className="text-xs">Pendentes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Client cards */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>
        ) : !filtered.length ? (
          <Card className="p-8 text-center text-muted-foreground">Nenhuma parcela encontrada para cobrança</Card>
        ) : (
          filtered.map((c) => (
            <ClienteCard
              key={c.cliente_id}
              cliente={c}
              onPagar={(p) => setPagamentoState({ open: true, data: p })}
              onRecibo={(p) => setReciboState({ open: true, data: p })}
              canPay={canRegisterPagamento}
              empresaId={profile?.empresa_id ?? ""}
            />
          ))
        )}
      </div>

      <PagamentoForm
        open={pagamentoState.open}
        onOpenChange={(v) => setPagamentoState({ open: v })}
        parcela={pagamentoState.data}
      />
      <ReciboParcela
        open={reciboState.open}
        onOpenChange={(v) => setReciboState({ open: v })}
        parcela={reciboState.data}
      />
    </div>
  );
}
