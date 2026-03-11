import { useState } from "react";
import { Shield, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuditLogs, useSecurityLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACAO_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  INSERT: { label: "Criação", variant: "default" },
  UPDATE: { label: "Alteração", variant: "secondary" },
  DELETE: { label: "Exclusão", variant: "destructive" },
};

export default function AuditPage() {
  const [tabelaFilter, setTabelaFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: logs, isLoading } = useAuditLogs({ tabela: tabelaFilter === "all" ? undefined : tabelaFilter });
  const { data: secLogs, isLoading: secLoading } = useSecurityLogs();

  const TABELAS = ["vendas", "clientes", "produtos", "parcelas", "pagamentos", "estoque"];

  const filteredLogs = logs?.filter(
    (l) => !search || l.tabela.includes(search) || l.registro_id?.includes(search) || l.acao.toLowerCase().includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Auditoria</h1>
          <p className="text-sm text-muted-foreground">Logs de alterações e segurança</p>
        </div>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Alterações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={tabelaFilter} onValueChange={setTabelaFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas tabelas</SelectItem>
                {TABELAS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : !filteredLogs?.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum log encontrado</TableCell></TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const acao = ACAO_MAP[log.acao] ?? { label: log.acao, variant: "outline" as const };
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{log.tabela}</TableCell>
                        <TableCell><Badge variant={acao.variant}>{acao.label}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{log.registro_id?.slice(0, 8) ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{log.usuario_id?.slice(0, 8) ?? "sistema"}</TableCell>
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
                      <TableCell className="font-mono text-xs">{log.usuario_id?.slice(0, 8) ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
