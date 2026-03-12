import { useState } from "react";
import { Shield, Search, Filter, Download, Eye, Calendar, User, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuditLogs, useSecurityLogs, useAuditUsers, type AuditLogEntry, type AuditFilters } from "@/hooks/useAuditLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportCSV, exportPDF } from "@/lib/reportExport";

const ACAO_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  INSERT: { label: "Criação", variant: "default" },
  UPDATE: { label: "Alteração", variant: "secondary" },
  DELETE: { label: "Exclusão", variant: "destructive" },
};

const TABELAS = ["vendas", "clientes", "produtos", "parcelas", "pagamentos", "movimentos_estoque", "estoque", "configuracoes", "romaneios"];

const TABELA_LABELS: Record<string, string> = {
  vendas: "Vendas",
  clientes: "Clientes",
  produtos: "Produtos",
  parcelas: "Parcelas",
  pagamentos: "Pagamentos",
  movimentos_estoque: "Movimentos Estoque",
  estoque: "Estoque",
  configuracoes: "Configurações",
  romaneios: "Romaneios",
};

export default function AuditPage() {
  const { isAdmin, rolesLoaded } = useAuth();

  if (rolesLoaded && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const [tabelaFilter, setTabelaFilter] = useState("all");
  const [acaoFilter, setAcaoFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filters: AuditFilters = {
    tabela: tabelaFilter === "all" ? undefined : tabelaFilter,
    acao: acaoFilter === "all" ? undefined : acaoFilter,
    usuario_id: userFilter === "all" ? undefined : userFilter,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
  };

  const { data: logs, isLoading } = useAuditLogs(filters);
  const { data: secLogs, isLoading: secLoading } = useSecurityLogs();
  const { data: users } = useAuditUsers();

  const userMap = new Map(users?.map((u) => [u.user_id, u.nome]) ?? []);

  const filteredLogs = logs?.filter(
    (l) =>
      !search ||
      l.tabela.toLowerCase().includes(search.toLowerCase()) ||
      l.registro_id?.includes(search) ||
      l.acao.toLowerCase().includes(search.toLowerCase()) ||
      userMap.get(l.usuario_id ?? "")?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!filteredLogs?.length) return;
    const rows = filteredLogs.map((l) => ({
      Data: format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss"),
      Tabela: TABELA_LABELS[l.tabela] ?? l.tabela,
      Ação: ACAO_MAP[l.acao]?.label ?? l.acao,
      Registro: l.registro_id ?? "—",
      Usuário: userMap.get(l.usuario_id ?? "") ?? l.usuario_id ?? "sistema",
    }));
    exportCSV(rows, `auditoria_${format(new Date(), "yyyyMMdd")}`);
  };

  const handleExportPDF = () => {
    if (!filteredLogs?.length) return;
    exportPDF({
      title: "Relatório de Auditoria",
      periodo: dataInicio && dataFim ? `${dataInicio} a ${dataFim}` : "Todos os registros",
      headers: ["Data", "Tabela", "Ação", "Registro", "Usuário"],
      rows: filteredLogs.map((l) => [
        format(new Date(l.created_at), "dd/MM/yy HH:mm"),
        TABELA_LABELS[l.tabela] ?? l.tabela,
        ACAO_MAP[l.acao]?.label ?? l.acao,
        l.registro_id?.slice(0, 8) ?? "—",
        userMap.get(l.usuario_id ?? "") ?? "sistema",
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Auditoria</h1>
            <p className="text-sm text-muted-foreground">Logs de alterações e segurança</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filteredLogs?.length}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!filteredLogs?.length}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Alterações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={tabelaFilter} onValueChange={setTabelaFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas tabelas</SelectItem>
                {TABELAS.map((t) => (
                  <SelectItem key={t} value={t}>{TABELA_LABELS[t] ?? t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={acaoFilter} onValueChange={setAcaoFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Alteração</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[160px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos usuários</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" className="w-[140px]" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <span className="text-muted-foreground text-xs">a</span>
              <Input type="date" className="w-[140px]" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{filteredLogs?.length ?? 0} registros</span>
            {filteredLogs && (
              <>
                <span>•</span>
                <span>{filteredLogs.filter((l) => l.acao === "INSERT").length} criações</span>
                <span>{filteredLogs.filter((l) => l.acao === "UPDATE").length} alterações</span>
                <span>{filteredLogs.filter((l) => l.acao === "DELETE").length} exclusões</span>
              </>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : !filteredLogs?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum log encontrado</TableCell></TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const acao = ACAO_MAP[log.acao] ?? { label: log.acao, variant: "outline" as const };
                    return (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{TABELA_LABELS[log.tabela] ?? log.tabela}</TableCell>
                        <TableCell><Badge variant={acao.variant}>{acao.label}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{log.registro_id?.slice(0, 8) ?? "—"}</TableCell>
                        <TableCell className="text-xs">{userMap.get(log.usuario_id ?? "") ?? "sistema"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : !secLogs?.length ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum log de segurança</TableCell></TableRow>
                ) : (
                  secLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.evento}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {JSON.stringify(log.detalhes)}
                      </TableCell>
                      <TableCell className="text-xs">{userMap.get(log.usuario_id ?? "") ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuário:</span>
                  <p className="font-medium">{userMap.get(selectedLog.usuario_id ?? "") ?? "sistema"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entidade:</span>
                  <p className="font-medium">{TABELA_LABELS[selectedLog.tabela] ?? selectedLog.tabela}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ação:</span>
                  <Badge variant={ACAO_MAP[selectedLog.acao]?.variant ?? "outline"}>
                    {ACAO_MAP[selectedLog.acao]?.label ?? selectedLog.acao}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">ID do Registro:</span>
                  <p className="font-mono text-xs">{selectedLog.registro_id ?? "—"}</p>
                </div>
              </div>

              {selectedLog.dados_anteriores && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Dados Anteriores</h4>
                  <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.dados_anteriores, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.dados_novos && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Dados Novos</h4>
                  <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.dados_novos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
