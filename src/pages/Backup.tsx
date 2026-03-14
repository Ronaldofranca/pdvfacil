import { useState, useEffect } from "react";
import {
  HardDrive, Download, FileSpreadsheet, Loader2, CheckCircle2,
  AlertCircle, Shield, Clock, Database, RefreshCw, CloudUpload,
  FileCheck, Trash2, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TABLES, TABLE_LABELS, CRITICAL_TABLES, FINANCIAL_TABLES,
  exportTable, downloadCsv, runServerBackup, getBackupLogs,
  listBackupFiles, downloadBackupFile,
  type BackupTable, type BackupLog,
} from "@/lib/backup";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sucesso: { label: "✅ Sucesso", variant: "default" },
  parcial: { label: "⚠️ Parcial", variant: "secondary" },
  falha: { label: "❌ Falha", variant: "destructive" },
  pendente: { label: "⏳ Pendente", variant: "outline" },
};

interface ExportResult {
  table: BackupTable;
  count: number;
  status: "success" | "error";
  message?: string;
}

export default function BackupPage() {
  const [selected, setSelected] = useState<Set<BackupTable>>(new Set(TABLES));
  const [exporting, setExporting] = useState(false);
  const [runningServer, setRunningServer] = useState(false);
  const [results, setResults] = useState<ExportResult[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["backup_logs"],
    queryFn: () => getBackupLogs(30),
    refetchInterval: 30000,
  });

  const toggleTable = (t: BackupTable) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(TABLES));
  const selectCritical = () => setSelected(new Set(CRITICAL_TABLES));
  const selectFinancial = () => setSelected(new Set(FINANCIAL_TABLES));

  const handleLocalExport = async () => {
    if (selected.size === 0) { toast.warning("Selecione ao menos uma tabela"); return; }
    setExporting(true);
    setResults([]);
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const newResults: ExportResult[] = [];
    for (const table of TABLES) {
      if (!selected.has(table)) continue;
      try {
        const { csv, count } = await exportTable(table);
        downloadCsv(csv, `backup_${table}_${timestamp}.csv`);
        newResults.push({ table, count, status: "success" });
      } catch (err: any) {
        newResults.push({ table, count: 0, status: "error", message: err.message });
      }
    }
    setResults(newResults);
    const ok = newResults.filter((r) => r.status === "success").length;
    const fail = newResults.filter((r) => r.status === "error").length;
    if (fail === 0) toast.success(`${ok} tabela(s) exportada(s)`);
    else toast.warning(`${ok} ok, ${fail} com erro`);
    setExporting(false);
  };

  const handleServerBackup = async (tipo: "completo" | "incremental") => {
    setRunningServer(true);
    try {
      const result = await runServerBackup(tipo);
      if (result?.status === "sucesso") {
        toast.success(`Backup ${tipo} concluído: ${result.registros} registros`);
      } else if (result?.status === "parcial") {
        toast.warning(`Backup parcial: ${result.erros?.join(", ")}`);
      } else {
        toast.error(`Backup falhou: ${result?.erros?.join(", ") || "Erro desconhecido"}`);
      }
      queryClient.invalidateQueries({ queryKey: ["backup_logs"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar backup");
    } finally {
      setRunningServer(false);
    }
  };

  const handleDownloadBackupFiles = async (log: BackupLog) => {
    if (!log.arquivo_url) { toast.error("Sem arquivo disponível"); return; }
    try {
      const files = await listBackupFiles(log.arquivo_url);
      if (files.length === 0) { toast.error("Nenhum arquivo encontrado"); return; }
      for (const file of files) {
        await downloadBackupFile(`${log.arquivo_url}/${file}`, file);
      }
      toast.success(`${files.length} arquivo(s) baixado(s)`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao baixar");
    }
  };

  const lastSuccessful = logs.find((l) => l.status === "sucesso");
  const failedCount = logs.filter((l) => l.status === "falha").length;
  const totalBackups = logs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Backup & Recuperação</h1>
            <p className="text-sm text-muted-foreground">Proteção avançada de dados</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Database className="w-4 h-4" /> Total
            </div>
            <p className="text-2xl font-bold">{totalBackups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Último OK
            </div>
            <p className="text-sm font-medium">
              {lastSuccessful
                ? formatDistanceToNow(new Date(lastSuccessful.created_at), { addSuffix: true, locale: ptBR })
                : "Nenhum"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertCircle className="w-4 h-4 text-destructive" /> Falhas
            </div>
            <p className="text-2xl font-bold">{failedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <HardDrive className="w-4 h-4" /> Armazenado
            </div>
            <p className="text-sm font-medium">
              {formatBytes(logs.reduce((s, l) => s + (l.tamanho_bytes || 0), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {failedCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {failedCount} backup(s) com falha detectado(s)
              </p>
              <p className="text-xs text-muted-foreground">
                Verifique o histórico abaixo e execute um novo backup.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="server" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="server">Backup em Nuvem</TabsTrigger>
          <TabsTrigger value="local">Download Local</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Server backup tab */}
        <TabsContent value="server" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CloudUpload className="w-4 h-4" /> Backup Completo
                </CardTitle>
                <CardDescription className="text-xs">
                  Exporta todas as {TABLES.length} tabelas críticas para o storage seguro.
                  Recomendado: diário.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleServerBackup("completo")}
                  disabled={runningServer}
                  className="w-full gap-2"
                >
                  {runningServer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Executar Backup Completo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Backup Incremental
                </CardTitle>
                <CardDescription className="text-xs">
                  Exporta apenas tabelas financeiras prioritárias (vendas, parcelas, pagamentos, pedidos, clientes).
                  Recomendado: a cada 2h.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => handleServerBackup("incremental")}
                  disabled={runningServer}
                  className="w-full gap-2"
                >
                  {runningServer ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Executar Backup Incremental
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4" /> Tabelas Cobertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TABLES.map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/30">
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                    <span>{TABLE_LABELS[t]}</span>
                    {CRITICAL_TABLES.includes(t) && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">Crítica</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Local export tab */}
        <TabsContent value="local" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold">Tabelas para exportar</CardTitle>
                <div className="flex gap-1 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={selectAll}>Todas</Button>
                  <Button variant="ghost" size="sm" onClick={selectCritical}>Críticas</Button>
                  <Button variant="ghost" size="sm" onClick={selectFinancial}>Financeiro</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Nenhuma</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TABLES.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox checked={selected.has(t)} onCheckedChange={() => toggleTable(t)} />
                    <div className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">{TABLE_LABELS[t]}</span>
                    </div>
                  </label>
                ))}
              </div>
              <Button
                className="w-full mt-4 gap-2"
                variant="outline"
                onClick={handleLocalExport}
                disabled={exporting || selected.size === 0}
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Baixar {selected.size} tabela(s) em CSV
              </Button>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Resultado</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {results.map((r) => (
                  <div key={r.table} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="flex items-center gap-2">
                      {r.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                      <span className="text-xs font-medium">{TABLE_LABELS[r.table]}</span>
                    </div>
                    <Badge variant={r.status === "success" ? "secondary" : "destructive"} className="text-xs">
                      {r.status === "success" ? `${r.count} reg.` : "Erro"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Histórico de Backups</CardTitle>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["backup_logs"] })}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum backup registrado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const st = STATUS_MAP[log.status] || STATUS_MAP.pendente;
                    const isExpanded = expandedLog === log.id;
                    return (
                      <div key={log.id} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                            <span className="text-xs font-medium capitalize">{log.tipo}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.verificado && <FileCheck className="w-3.5 h-3.5 text-green-500" />}
                            <span className="text-xs text-muted-foreground">
                              {log.registros_total} reg. • {formatBytes(log.tamanho_bytes)}
                            </span>
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t bg-muted/10">
                            <div className="pt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Tabelas:</span>
                                <p className="font-medium">{log.tabelas?.length || 0}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Registros:</span>
                                <p className="font-medium">{log.registros_total}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Tamanho:</span>
                                <p className="font-medium">{formatBytes(log.tamanho_bytes)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Verificado:</span>
                                <p className="font-medium">{log.verificado ? "✅ Sim" : "❌ Não"}</p>
                              </div>
                            </div>
                            {log.tabelas && log.tabelas.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {log.tabelas.map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                ))}
                              </div>
                            )}
                            {log.erro && (
                              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                                {log.erro}
                              </div>
                            )}
                            {log.arquivo_url && log.status !== "falha" && (
                              <Button
                                size="sm" variant="outline" className="gap-1.5"
                                onClick={() => handleDownloadBackupFiles(log)}
                              >
                                <Download className="w-3.5 h-3.5" /> Baixar Arquivos
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
