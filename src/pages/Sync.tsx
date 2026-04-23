import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Smartphone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Loader2,
  ListRestart,
  Database,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOffline } from "@/contexts/OfflineContext";
import { getAllQueueItems, clearSyncedItems, removeQueueItem, type QueueItem } from "@/lib/offline/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OP_LABEL: Record<string, string> = {
  insert: "Inserir",
  update: "Atualizar",
  delete: "Excluir",
  rpc: "Operação Atômica (RPC)",
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  synced: { label: "Sincronizado", variant: "default" },
  error: { label: "Erro", variant: "destructive" },
  conflict: { label: "Conflito", variant: "outline" },
};

interface SyncLog {
  id: string;
  table_name: string;
  operation: string;
  status: string;
  error_message: string | null;
  created_at: string;
  idempotency_key: string | null;
}

export default function SyncPage() {
  const { isOnline, isSyncing, pendingCount, errorCount, deviceId, lastSync, syncAll, retryErrors, refreshCounts } =
    useOffline();

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [serverLogs, setServerLogs] = useState<SyncLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const loadQueue = useCallback(async () => {
    const items = await getAllQueueItems();
    setQueueItems(items);
    await refreshCounts();
  }, [refreshCounts]);

  const loadServerLogs = useCallback(async () => {
    if (!isOnline) return;
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setServerLogs(data || []);
    } catch (err) {
      console.error("Failed to load sync logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadQueue();
    loadServerLogs();
  }, [pendingCount, errorCount, loadQueue, loadServerLogs]);

  const handleSync = async () => {
    await syncAll();
    loadQueue();
    loadServerLogs();
  };

  const handleRetry = async () => {
    await retryErrors();
    loadQueue();
    loadServerLogs();
  };

  const handleRemove = async (uuid: string) => {
    await removeQueueItem(uuid);
    toast.success("Item removido da fila");
    loadQueue();
  };

  const handleClearSynced = async () => {
    const count = await clearSyncedItems();
    toast.success(`${count} itens limpos`);
    loadQueue();
  };

  const handleForceReload = () => {
    if (confirm("Isso irá recarregar o aplicativo e limpar cache temporário. Deseja continuar?")) {
      window.location.reload();
    }
  };

  const handleClearAppCache = async () => {
    if (!confirm("Isso irá limpar TODOS os dados locais de cache (exceto vendas pendentes). Use apenas se o sistema estiver travado no celular. Prosseguir?")) return;
    
    try {
      // Clear Service Worker caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      toast.success("Cache limpo. Recarregando...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error("Erro ao limpar cache");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <RefreshCw className={`w-6 h-6 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sincronização Robusta</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua fila offline e audite logs do servidor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? "default" : "destructive"} className="px-3 py-1 gap-1.5 text-xs font-semibold uppercase tracking-wider">
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* KPIs & Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-secondary/50 p-2 rounded-lg">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">{deviceId?.slice(0, 8)}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID do Dispositivo</p>
              <h3 className="text-xs font-mono text-foreground break-all mt-1">{deviceId}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <Badge variant={pendingCount > 0 ? "secondary" : "outline"}>{pendingCount} itens</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vendas Pendentes</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{pendingCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-destructive/10 p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <Badge variant={errorCount > 0 ? "destructive" : "outline"}>{errorCount} erros</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Falhas de Sync</p>
              <h3 className="text-2xl font-bold text-destructive mt-1">{errorCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
            <Button 
              size="sm" 
              className="gap-2 px-4 shadow-sm" 
              onClick={handleSync} 
              disabled={isSyncing || !isOnline || (pendingCount === 0 && errorCount === 0)}
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar Pendentes e Erros
            </Button>
            
            <Button size="sm" variant="outline" className="gap-2" onClick={handleClearSynced}>
              <Trash2 className="w-4 h-4" />
              Limpar Concluídos
            </Button>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="gap-2 text-xs" onClick={handleForceReload}>
                <ListRestart className="w-4 h-4" />
                Atualizar App
              </Button>
              <Button size="sm" variant="ghost" className="gap-2 text-xs text-destructive hover:text-destructive" onClick={handleClearAppCache}>
                <Database className="w-4 h-4" />
                Limpar Cache
              </Button>
            </div>
          </div>

          {/* Queue Table */}
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Fila Offline Atual
                  </CardTitle>
                  <CardDescription>Operações aguardando envio neste dispositivo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                {queueItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-primary/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Tudo em dia!</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">Não há vendas pendentes neste terminal.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-24">Seq.</TableHead>
                        <TableHead>Operação</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueItems.map((item, idx) => {
                        const st = STATUS_MAP[item.status_sync] ?? STATUS_MAP.pending;
                        return (
                          <TableRow key={item.uuid} className="group transition-colors hover:bg-muted/30">
                            <TableCell className="font-mono text-[10px] text-muted-foreground">#{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-foreground">{item.table.toUpperCase()}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{OP_LABEL[item.operation] ?? item.operation}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-[11px] font-medium text-muted-foreground">
                              {format(new Date(item.timestamp), "HH:mm:ss", { locale: ptBR })}
                              <span className="block text-[9px] opacity-70">{format(new Date(item.timestamp), "dd/MM/yyyy", { locale: ptBR })}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={st.variant} className="text-[10px] uppercase font-bold px-2 py-0">
                                {st.label}
                              </Badge>
                              {item.error_message && (
                                <p className="text-[10px] text-destructive mt-1 font-medium max-w-[150px] leading-tight">{item.error_message}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemove(item.uuid)}>
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs (Sidebar) */}
        <div className="space-y-4">
          <Card className="h-full bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Últimos Logs do Servidor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isOnline ? (
                <div className="py-10 text-center space-y-2">
                  <WifiOff className="w-8 h-8 mx-auto text-muted-foreground opacity-30" />
                  <p className="text-xs text-muted-foreground">Offline: Histórico indisponível</p>
                </div>
              ) : isLoadingLogs ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </div>
              ) : serverLogs.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-10">Nenhum log encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {serverLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border border-border bg-card/80 text-[11px] relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold uppercase">{log.table_name}</span>
                        <span className="text-[9px] opacity-60">{format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}</span>
                      </div>
                      <p className="text-muted-foreground mb-1 italic">
                        {log.operation.split(':')[1] || log.operation}
                      </p>
                      {log.error_message ? (
                        <p className="text-destructive font-bold break-words">{log.error_message}</p>
                      ) : (
                        <p className="text-green-500 font-bold">✓ Sincronizado com sucesso</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
