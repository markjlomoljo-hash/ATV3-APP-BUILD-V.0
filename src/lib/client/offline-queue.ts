// Offline queue for task completions and treatment check-ins ONLY. This
// queue never invents completions — it only stores an action the user
// actually took while offline, tagged with an idempotency key, and replays
// it once connectivity returns. The backend deduplicates by that same key
// (clientCompletionId / clientCheckinId), so replays are always safe.

export type QueueItemType = "task_completion" | "treatment_checkin";

export type QueueItem = {
  localId: string;
  type: QueueItemType;
  idempotencyKey: string;
  createdAt: string;
  intendedLocalDate: string;
  payload: Record<string, unknown>;
  endpoint: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  retryCount: number;
  lastError?: string;
};

const STORAGE_KEY = "acnetrex_phase6_offline_queue";

function readQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function enqueue(item: Omit<QueueItem, "localId" | "createdAt" | "syncStatus" | "retryCount">) {
  const queue = readQueue();
  const entry: QueueItem = {
    ...item,
    localId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    retryCount: 0,
  };
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function getQueue() {
  return readQueue();
}

export function removeFromQueue(localId: string) {
  writeQueue(readQueue().filter((q) => q.localId !== localId));
}

export function updateQueueItem(localId: string, patch: Partial<QueueItem>) {
  const queue = readQueue();
  const idx = queue.findIndex((q) => q.localId === localId);
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], ...patch };
    writeQueue(queue);
  }
}

/** Attempts to replay every pending/error queue item. Safe to call
 * repeatedly (e.g. on reconnect, on interval, on page load). */
export async function syncQueue(onChange?: () => void) {
  const queue = readQueue();
  for (const item of queue) {
    if (item.syncStatus === "synced" || item.syncStatus === "syncing") continue;
    updateQueueItem(item.localId, { syncStatus: "syncing" });
    onChange?.();
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(item.payload),
      });
      if (!res.ok && res.status !== 409) {
        throw new Error(`Sync failed (${res.status})`);
      }
      updateQueueItem(item.localId, { syncStatus: "synced" });
      removeFromQueue(item.localId);
    } catch (err) {
      updateQueueItem(item.localId, {
        syncStatus: "error",
        retryCount: item.retryCount + 1,
        lastError: err instanceof Error ? err.message : "Unknown sync error",
      });
    }
    onChange?.();
  }
}
