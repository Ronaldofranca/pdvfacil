import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { v4 as uuidv4 } from "uuid";

// ─── Schema ───
export type SyncStatus = "pending" | "synced" | "error" | "conflict";

export interface SyncMeta {
  uuid: string;
  timestamp: string;
  device_id: string;
  status_sync: SyncStatus;
  error_message?: string;
}

export interface QueueItem extends SyncMeta {
  table: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  retries: number;
}

export interface CacheItem {
  key: string; // "table:empresa_id"
  data: unknown;
  updated_at: string;
}

interface OfflineDB extends DBSchema {
  sync_queue: {
    key: string;
    value: QueueItem;
    indexes: {
      "by-status": SyncStatus;
      "by-table": string;
      "by-timestamp": string;
    };
  };
  cache: {
    key: string;
    value: CacheItem;
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

const DB_NAME = "erp_offline";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Sync queue store
      const queueStore = db.createObjectStore("sync_queue", { keyPath: "uuid" });
      queueStore.createIndex("by-status", "status_sync");
      queueStore.createIndex("by-table", "table");
      queueStore.createIndex("by-timestamp", "timestamp");

      // Cache store
      db.createObjectStore("cache", { keyPath: "key" });

      // Meta store (device_id, last_sync, etc)
      db.createObjectStore("meta", { keyPath: "key" });
    },
  });

  return dbInstance;
}

// ─── Device ID ───
export async function getDeviceId(): Promise<string> {
  const db = await getDB();
  const existing = await db.get("meta", "device_id");
  if (existing) return existing.value;

  const deviceId = uuidv4();
  await db.put("meta", { key: "device_id", value: deviceId });
  return deviceId;
}

// ─── Queue Operations ───
export async function enqueue(
  table: string,
  operation: QueueItem["operation"],
  payload: Record<string, unknown>,
): Promise<QueueItem> {
  const db = await getDB();
  const deviceId = await getDeviceId();

  const item: QueueItem = {
    uuid: uuidv4(),
    timestamp: new Date().toISOString(),
    device_id: deviceId,
    status_sync: "pending",
    table,
    operation,
    payload,
    retries: 0,
  };

  await db.put("sync_queue", item);
  return item;
}

export async function getQueueByStatus(status: SyncStatus): Promise<QueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("sync_queue", "by-status", status);
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex("sync_queue", "by-status", "pending");
}

export async function getErrorCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex("sync_queue", "by-status", "error");
}

export async function updateQueueItem(uuid: string, updates: Partial<QueueItem>): Promise<void> {
  const db = await getDB();
  const item = await db.get("sync_queue", uuid);
  if (item) {
    await db.put("sync_queue", { ...item, ...updates });
  }
}

export async function removeQueueItem(uuid: string): Promise<void> {
  const db = await getDB();
  await db.delete("sync_queue", uuid);
}

export async function clearSyncedItems(): Promise<number> {
  const db = await getDB();
  const synced = await db.getAllFromIndex("sync_queue", "by-status", "synced");
  for (const item of synced) {
    await db.delete("sync_queue", item.uuid);
  }
  return synced.length;
}

export async function getAllQueueItems(): Promise<QueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("sync_queue", "by-timestamp");
}

// ─── Cache Operations ───
export async function setCache(key: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put("cache", { key, data, updated_at: new Date().toISOString() });
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const db = await getDB();
  const item = await db.get("cache", key);
  return item ? (item.data as T) : null;
}

// ─── Meta ───
export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value });
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDB();
  const item = await db.get("meta", key);
  return item?.value ?? null;
}
