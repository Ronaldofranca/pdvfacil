import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOffline } from "@/contexts/OfflineContext";
import { getAllQueueItems, clearSyncedItems, removeQueueItem, type QueueItem } from "@/lib/offline/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const OP_LABEL: Record<string, string> = {
  insert: "Inserir",
  update: "Atualizar",
  delete: "Excluir",
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  synced: { label: "Sincronizado", variant: "default" },
  error: { label: "Erro", variant: "destructive" },
  conflict: { label: "Conflito", variant: "outline" },
};

export default function SyncPage() {
  const { isOnline, isSyncing, pendingCount, errorCount, deviceId, lastSync, sync, retryErrors, refreshCounts } =
    useOffline();

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  const loadQueue = async () => {
    const items = await getAllQueueItems();
    setQueueItems(items);
    await refreshCounts();
  };

  useEffect(() => {
    loadQueue();
  }, [pendingCount, errorCount]);

  const handleSync = async () => {
    await sync();
    loadQueue();
  };

  const handleRetry = async () => {
    await retryErrors();
    loadQueue();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sincronização</h1>
            <p className="text-sm text-muted-foreground">Fila offline e status de sync</p>
          </div>
        </div>
        <Badge variant={isOnline ? "default" : "destructive"} className="gap-1.5">
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Com erro</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{errorCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Device ID</span>
            </div>
            <p className="text-xs font-mono text-foreground truncate">{deviceId?.slice(0, 12) ?? "—"}...</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Último sync</span>
            </div>
            <p className="text-xs text-foreground">
              {lastSync ? format(new Date(lastSync), "dd/MM HH:mm:ss", { locale: ptBR }) : "Nunca"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" className="gap-1.5" onClick={handleSync} disabled={isSyncing || !isOnline || pendingCount === 0}>
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar agora
        </Button>
        {errorCount > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRetry} disabled={isSyncing || !isOnline}>
            <RotateCcw className="w-4 h-4" />
            Retentar erros ({errorCount})
          </Button>
        )}
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={handleClearSynced}>
          <Trash2 className="w-4 h-4" />
          Limpar sincronizados
        </Button>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Fila de Sincronização</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {queueItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Fila vazia — tudo sincronizado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => {
                  const st = STATUS_MAP[item.status_sync] ?? STATUS_MAP.pending;
                  return (
                    <TableRow key={item.uuid}>
                      <TableCell className="font-mono text-xs">{item.uuid.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium text-sm">{item.table}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{OP_LABEL[item.operation] ?? item.operation}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(item.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {item.error_message && (
                          <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">{item.error_message}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.uuid)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
