import { supabase } from "@/integrations/supabase/client";
import {
  getQueueByStatus,
  updateQueueItem,
  removeQueueItem,
  setMeta,
  type QueueItem,
} from "./db";

const MAX_RETRIES = 3;

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: { uuid: string; message: string }[];
}

async function logSyncEvent(item: QueueItem, status: "success" | "error", error?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // For RPC calls like fn_finalizar_venda_atomica, the RPC itself might already log to sync_logs.
    // However, to ensure all operations (insert, update, delete) are tracked, we log here too.
    // If it's the specific sale RPC, it already logs, so we could skip it to avoid double logs,
    // but the server-side log is more reliable for database errors.
    // We'll log here as "Client-side Sync Report".
    
    await (supabase as any).from("sync_logs").insert({
      empresa_id: (item.payload as any).params?._empresa_id || (item.payload as any)._empresa_id || (item.payload as any).empresa_id,
      vendedor_id: user.id,
      device_id: item.device_id,
      table_name: item.table,
      operation: item.operation,
      idempotency_key: (item.payload as any).idempotency_key || (item.payload as any).params?._idempotency_key,
      status: status,
      error_message: error,
      payload: item.payload,
    });
  } catch (err) {
    console.warn("Failed to log sync event to server:", err);
  }
}

async function processItem(item: QueueItem): Promise<"ok" | "skipped"> {
  const { table, operation, payload } = item;
  const client = supabase as any;

  // Handle RPC calls (e.g., offline PDV sales)
  if (operation === "rpc") {
    const { fn_name, params } = payload as { fn_name: string; params: Record<string, unknown> };
    const { data, error } = await client.rpc(fn_name, params);
    if (error) {
      // Idempotency: if the sale was already processed, skip
      if (error.message?.includes("already_processed") || error.code === "23505") {
        return "skipped";
      }
      await logSyncEvent(item, "error", error.message);
      throw error;
    }
    // Check if RPC returned already_processed flag
    if (data?.already_processed) {
      return "skipped";
    }
    await logSyncEvent(item, "success");
    return "ok";
  }

  try {
    switch (operation) {
      case "insert": {
        // Idempotent insert: use upsert with the payload's id to avoid duplicates
        if (payload.id) {
          const { error } = await client.from(table).upsert(payload, {
            onConflict: "id",
            ignoreDuplicates: true,
          });
          if (error) {
            if (error.code === "23505") return "skipped";
            throw error;
          }
        } else {
          const { error } = await client.from(table).insert(payload);
          if (error) {
            if (error.code === "23505") return "skipped";
            throw error;
          }
        }
        break;
      }
      case "update": {
        const { id, ...rest } = payload;
        const { error } = await client.from(table).update(rest).eq("id", id);
        if (error) throw error;
        break;
      }
      case "delete": {
        const { error } = await client.from(table).delete().eq("id", payload.id);
        if (error) throw error;
        break;
      }
    }
    await logSyncEvent(item, "success");
    return "ok";
  } catch (err: any) {
    await logSyncEvent(item, "error", err.message);
    throw err;
  }
}

export async function processSyncQueue(): Promise<SyncResult> {
  const pending = await getQueueByStatus("pending");
  const errors: SyncResult["errors"] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Sort by timestamp (FIFO)
  pending.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Deduplicate: if multiple items target same table+id+operation, keep only the latest
  const seen = new Map<string, QueueItem>();
  const deduped: QueueItem[] = [];
  for (const item of pending) {
    const key = `${item.table}:${item.operation}:${(item.payload as any).id ?? (item.payload as any).idempotency_key ?? (item.payload as any).params?._idempotency_key ?? item.uuid}`;
    if (seen.has(key)) {
      // Remove earlier duplicate from queue
      const earlier = seen.get(key)!;
      await removeQueueItem(earlier.uuid);
      skipped++;
      // Replace with latest
      const idx = deduped.indexOf(earlier);
      if (idx >= 0) deduped.splice(idx, 1);
    }
    seen.set(key, item);
    deduped.push(item);
  }

  for (const item of deduped) {
    try {
      const result = await processItem(item);
      await removeQueueItem(item.uuid);
      if (result === "skipped") {
        skipped++;
      } else {
        succeeded++;
      }
    } catch (err: any) {
      const message = err?.message ?? "Erro desconhecido";
      
      // Detecção de erro de rede (transiente)
      if (message.toLowerCase().includes("failed to fetch") || (err?.name === "TypeError" && message.toLowerCase().includes("failed"))) {
        console.warn("SyncEngine: Falha de rede detectada. Abortando sincronização para tentar mais tarde.");
        return { processed: pending.length, succeeded, failed, skipped, errors };
      }

      const retries = item.retries + 1;

      if (retries >= MAX_RETRIES) {
        await updateQueueItem(item.uuid, {
          status_sync: "error",
          error_message: message,
          retries,
        });
      } else {
        await updateQueueItem(item.uuid, {
          retries,
          error_message: message,
        });
      }

      failed++;
      errors.push({ uuid: item.uuid, message });
    }
  }

  await setMeta("last_sync", new Date().toISOString());

  return { processed: pending.length, succeeded, failed, skipped, errors };
}

export async function retryErrorItems(): Promise<SyncResult> {
  const errorItems = await getQueueByStatus("error");

  // Reset to pending
  for (const item of errorItems) {
    await updateQueueItem(item.uuid, {
      status_sync: "pending",
      retries: 0,
      error_message: undefined,
    });
  }

  return processSyncQueue();
}

