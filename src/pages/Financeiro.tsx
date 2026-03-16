import { useState } from "react";
import { DollarSign, Search, Plus, CreditCard, AlertTriangle, CheckCircle, Clock, Filter, Receipt, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParcelas } from "@/hooks/useParcelas";
import { usePermissions } from "@/hooks/usePermissions";
import { GerarParcelasForm } from "@/components/financeiro/GerarParcelasForm";
import { PagamentoForm } from "@/components/financeiro/PagamentoForm";
import { ReciboParcela } from "@/components/financeiro/ReciboParcela";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CFG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "secondary", icon: Clock },
  parcial: { label: "Parcial", variant: "outline", icon: CircleDot },
  paga: { label: "Paga", variant: "default", icon: CheckCircle },
  vencida: { label: "Vencida", variant: "destructive", icon: AlertTriangle },
};

export default function FinanceiroPage() {
  const { canRegisterPagamento } = usePermissions();
  const [statusFilter, setStatusFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [gerarOpen, setGerarOpen] = useState(false);
  const [pagamentoState, setPagamentoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [reciboState, setReciboState] = useState<{ open: boolean; data?: any }>({ open: false });

  const filters = statusFilter !== "todas" ? { status: statusFilter } : undefined;
  const { data: parcelas, isLoading } = useParcelas(filters);
  const { data: todasParcelas } = useParcelas();

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = parcelas?.filter((p) =>
    (p as any).clientes?.nome?.toLowerCase().includes(search.toLowerCase()) || !search
  );

  // Resumo sempre baseado em TODAS as parcelas
  const totalPendente = todasParcelas?.filter((p) => p.status === "pendente" || p.status === "parcial").reduce((s, p) => s + Number(p.saldo), 0) ?? 0;
  const totalVencido = todasParcelas?.filter((p) => p.status === "vencida").reduce((s, p) => s + Number(p.saldo), 0) ?? 0;
  const totalPago = todasParcelas?.filter((p) => p.status === "paga").reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;
  const totalParcial = todasParcelas?.filter((p) => p.status === "parcial").reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Parcelas e cobranças</p>
          </div>
        </div>
        {canRegisterPagamento && (
          <Button size="sm" className="gap-1.5" onClick={() => setGerarOpen(true)}>
            <Plus className="w-4 h-4" /> Gerar Parcelas
          </Button>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalPendente)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Vencido</p>
          <p className="text-lg font-bold text-destructive">{fmt(totalVencido)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Parcialmente Pago</p>
          <p className="text-lg font-bold text-accent-foreground">{fmt(totalParcial)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-lg font-bold text-primary">{fmt(totalPago)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="parcial">Parcialmente Pagas</SelectItem>
            <SelectItem value="vencida">Vencidas</SelectItem>
            <SelectItem value="paga">Pagas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Status</TableHead>
              {canRegisterPagamento && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma parcela encontrada</TableCell></TableRow>
            ) : (
              filtered.map((p) => {
                const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pendente;
                const Icon = cfg.icon;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.numero}ª</TableCell>
                    <TableCell>{(p as any).clientes?.nome ?? "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">{fmt(Number(p.valor_total))}</TableCell>
                    <TableCell className="text-right">{fmt(Number(p.valor_pago))}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(Number(p.saldo))}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant} className="gap-1">
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    {canRegisterPagamento && (
                      <TableCell className="flex gap-1">
                        {p.status !== "paga" && (
                          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setPagamentoState({ open: true, data: p })}>
                            <CreditCard className="w-3 h-3" /> Pagar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setReciboState({ open: true, data: p })}>
                          <Receipt className="w-3 h-3" /> Recibo
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <GerarParcelasForm open={gerarOpen} onOpenChange={setGerarOpen} />
      <PagamentoForm open={pagamentoState.open} onOpenChange={(v) => setPagamentoState({ open: v })} parcela={pagamentoState.data} />
      <ReciboParcela open={reciboState.open} onOpenChange={(v) => setReciboState({ open: v })} parcela={reciboState.data} />
    </div>
  );
}
