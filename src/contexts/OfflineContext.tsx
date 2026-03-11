import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import {
  getPendingCount,
  getErrorCount,
  getDeviceId,
  getMeta,
  clearSyncedItems,
  type QueueItem,
} from "@/lib/offline/db";
import { processSyncQueue, retryErrorItems, type SyncResult } from "@/lib/offline/syncEngine";
import { toast } from "sonner";

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  errorCount: number;
  deviceId: string | null;
  lastSync: string | null;
  sync: () => Promise<SyncResult | null>;
  retryErrors: () => Promise<SyncResult | null>;
  refreshCounts: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const SYNC_INTERVAL = 30_000; // 30s

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const refreshCounts = useCallback(async () => {
    const [p, e, ls] = await Promise.all([
      getPendingCount(),
      getErrorCount(),
      getMeta("last_sync"),
    ]);
    setPendingCount(p);
    setErrorCount(e);
    setLastSync(ls);
  }, []);

  const sync = useCallback(async (): Promise<SyncResult | null> => {
    if (!navigator.onLine || isSyncing) return null;
    setIsSyncing(true);
    try {
      const result = await processSyncQueue();
      await clearSyncedItems();
      await refreshCounts();
      if (result.processed > 0) {
        if (result.failed === 0) {
          toast.success(`${result.succeeded} operações sincronizadas`);
        } else {
          toast.warning(`${result.succeeded} ok, ${result.failed} com erro`);
        }
      }
      return result;
    } catch (err) {
      console.error("Sync error:", err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshCounts]);

  const retryErrors = useCallback(async (): Promise<SyncResult | null> => {
    if (!navigator.onLine || isSyncing) return null;
    setIsSyncing(true);
    try {
      const result = await retryErrorItems();
      await clearSyncedItems();
      await refreshCounts();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshCounts]);

  // Online/offline listeners
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restabelecida");
      sync();
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.warning("Sem conexão — operações serão salvas localmente");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [sync]);

  // Init
  useEffect(() => {
    getDeviceId().then(setDeviceId);
    refreshCounts();
  }, [refreshCounts]);

  // Auto-sync interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (navigator.onLine && pendingCount > 0) {
        sync();
      }
    }, SYNC_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [sync, pendingCount]);

  return (
    <OfflineContext.Provider
      value={{ isOnline, isSyncing, pendingCount, errorCount, deviceId, lastSync, sync, retryErrors, refreshCounts }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline deve ser usado dentro de OfflineProvider");
  return ctx;
}
