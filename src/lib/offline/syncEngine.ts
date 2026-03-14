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

async function processItem(item: QueueItem): Promise<"ok" | "skipped"> {
  const { table, operation, payload } = item;
  const client = supabase as any;

  switch (operation) {
    case "insert": {
      // Idempotent insert: use upsert with the payload's id to avoid duplicates
      if (payload.id) {
        const { error } = await client.from(table).upsert(payload, {
          onConflict: "id",
          ignoreDuplicates: true,
        });
        if (error) {
          // If it's a unique constraint violation, the record already exists — skip
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
  return "ok";
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
    const key = `${item.table}:${item.operation}:${(item.payload as any).id ?? item.uuid}`;
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
