import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarClock, Search, Filter, MapPin, Phone, ShoppingCart, Truck, CheckCircle, ExternalLink, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePedidos, useAtualizarStatusPedido } from "@/hooks/usePedidos";
import { format } from "date-fns";
import { fmtR } from "@/lib/reportExport";

type TabFilter = "hoje" | "amanha" | "atrasados" | "todos";

export default function AgendaEntregasPage() {
  const navigate = useNavigate();
  const atualizarStatus = useAtualizarStatusPedido();

  const [tab, setTab] = useState<TabFilter>("hoje");
  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState("pendentes");

  const { data: pedidos, isLoading } = usePedidos();

  const hoje = new Date().toISOString().split("T")[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const pendentes = (pedidos ?? []).filter((p) =>
    ["rascunho", "aguardando_entrega", "em_rota"].includes(p.status)
  );

  const filtrados = pendentes
    .filter((p) => {
      if (tab === "hoje") return p.data_prevista_entrega === hoje;
      if (tab === "amanha") return p.data_prevista_entrega === amanha;
      if (tab === "atrasados") return p.data_prevista_entrega < hoje;
      return true;
    })
    .filter((p) => {
      if (busca && !p.clientes?.nome?.toLowerCase().includes(busca.toLowerCase())) return false;
      if (statusFilter === "em_rota") return p.status === "em_rota";
      if (statusFilter === "aguardando") return p.status === "aguardando_entrega";
      return true;
    })
    .sort((a, b) => a.data_prevista_entrega.localeCompare(b.data_prevista_entrega));

  const contHoje = pendentes.filter((p) => p.data_prevista_entrega === hoje).length;
  const contAmanha = pendentes.filter((p) => p.data_prevista_entrega === amanha).length;
  const contAtrasados = pendentes.filter((p) => p.data_prevista_entrega < hoje).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Agenda de Entregas</h1>
            <p className="text-sm text-muted-foreground">{pendentes.length} pedidos pendentes</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/pedidos")}>
          Ver Todos
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={contAtrasados > 0 ? "border-destructive/30" : ""}>
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${contAtrasados > 0 ? "text-destructive" : "text-muted-foreground"}`}>{contAtrasados}</p>
            <p className="text-[10px] text-muted-foreground">Atrasados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{contHoje}</p>
            <p className="text-[10px] text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{contAmanha}</p>
            <p className="text-[10px] text-muted-foreground">Amanhã</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
        <TabsList className="w-full">
          <TabsTrigger value="atrasados" className="flex-1 gap-1">
            Atrasados {contAtrasados > 0 && <Badge variant="destructive" className="text-[9px] px-1">{contAtrasados}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="hoje" className="flex-1">Hoje ({contHoje})</TabsTrigger>
          <TabsTrigger value="amanha" className="flex-1">Amanhã ({contAmanha})</TabsTrigger>
          <TabsTrigger value="todos" className="flex-1">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendentes">Pendentes</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="em_rota">Em Rota</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de entregas */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma entrega encontrada</p>
        ) : (
          filtrados.map((p) => {
            const atrasado = p.data_prevista_entrega < hoje;
            return (
              <Card key={p.id} className={atrasado ? "border-destructive/30" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground truncate">{p.clientes?.nome ?? "—"}</p>
                        {atrasado && <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>}
                        {p.status === "em_rota" && <Badge className="text-[10px]">Em Rota</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        📅 {format(new Date(p.data_prevista_entrega + "T12:00:00"), "dd/MM/yyyy")}
                        {p.horario_entrega && ` às ${p.horario_entrega}`}
                      </p>
                      {p.clientes && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          📍 {[p.clientes.bairro, p.clientes.cidade].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-primary mt-1">{fmtR(Number(p.valor_total))}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/pedidos?detail=${p.id}`)} title="Ver pedido">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {p.clientes?.telefone && (
                        <Button size="icon" variant="outline" className="h-8 w-8" asChild title="Ligar">
                          <a href={`tel:${p.clientes.telefone}`}><Phone className="w-3.5 h-3.5" /></a>
                        </Button>
                      )}
                      {p.clientes?.latitude && p.clientes?.longitude && (
                        <Button size="icon" variant="outline" className="h-8 w-8" title="Rota"
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.clientes!.latitude},${p.clientes!.longitude}`, "_blank")}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {p.status === "aguardando_entrega" && (
                        <Button size="icon" variant="default" className="h-8 w-8" onClick={() => atualizarStatus.mutate({ id: p.id, status: "em_rota" })} title="Em rota">
                          <Truck className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {p.status === "em_rota" && (
                        <Button size="icon" variant="default" className="h-8 w-8" onClick={() => atualizarStatus.mutate({ id: p.id, status: "entregue" })} title="Entregar">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
