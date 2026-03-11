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
  errors: { uuid: string; message: string }[];
}

async function processItem(item: QueueItem): Promise<void> {
  const { table, operation, payload } = item;

  switch (operation) {
    case "insert": {
      const { error } = await supabase.from(table).insert(payload as any);
      if (error) throw error;
      break;
    }
    case "update": {
      const { id, ...rest } = payload;
      const { error } = await supabase
        .from(table)
        .update(rest as any)
        .eq("id", id as string);
      if (error) throw error;
      break;
    }
    case "delete": {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", payload.id as string);
      if (error) throw error;
      break;
    }
  }
}

export async function processSyncQueue(): Promise<SyncResult> {
  const pending = await getQueueByStatus("pending");
  const errors: SyncResult["errors"] = [];
  let succeeded = 0;
  let failed = 0;

  // Sort by timestamp (FIFO)
  pending.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const item of pending) {
    try {
      await processItem(item);
      await removeQueueItem(item.uuid);
      succeeded++;
    } catch (err: any) {
      const message = err?.message ?? "Erro desconhecido";
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

  return { processed: pending.length, succeeded, failed, errors };
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
