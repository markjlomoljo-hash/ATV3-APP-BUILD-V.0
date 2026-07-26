/**
 * Local Offline Outbox
 *
 * Device-side persistence for writes that could not reach Supabase because
 * the network was unavailable. Events are stored in the encrypted private
 * database (same SQLCipher store used by the ML offline queue) and replayed
 * when connectivity returns — on app foreground and after any later
 * successful write.
 *
 * Replay is idempotent and follows the outbox contract in outbox-service:
 * - Domain rows carry ids generated at enqueue time, so replaying the same
 *   event upserts the same row instead of duplicating it.
 * - The server outbox event reuses the deduplication key generated at
 *   enqueue time (same derivation as writeOutboxEvent), so the outbox_events
 *   row is written at most once per event.
 *
 * Nothing here fabricates success: an event stays pending until the real
 * write succeeds. Terminal failures are kept with their error codes and are
 * always surfaced — getLocalOutboxSummary exposes failed counts + the last
 * recorded error for the UI banner, ReplayResult.failed reports the exact
 * pass on which an event became terminal (so callers can alert once on the
 * transition), and retryFailedLocalOutboxEvents gives the user a real
 * recovery path. A failed event never silently disappears.
 */

import { randomUUID } from "expo-crypto";

import { supabase } from "./supabase";
import { openPrivateDatabase } from "./private-database";
import { writeOutboxEvent, type OutboxEventType } from "./outbox-service";
import { isNetworkAvailable, isNetworkError } from "./network";
import { CONSENT_DEFAULTS } from "./contracts";

export interface LocalOutboxEvent {
  id: string;
  user_id: string;
  event_type: OutboxEventType;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  deduplication_key: string;
  created_at: string;
  attempt_count: number;
  status: "pending" | "failed";
  last_error_code: string | null;
}

type StoredLocalOutboxEvent = Omit<LocalOutboxEvent, "payload"> & {
  payload_json: string;
};

interface OutboxDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: (string | number | null)[]): Promise<T[]>;
}

const MAX_REPLAY_ATTEMPTS = 5;

let databasePromise: Promise<OutboxDatabase> | null = null;

async function getDatabase(): Promise<OutboxDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await openPrivateDatabase();
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS local_outbox_events (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          deduplication_key TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          last_error_code TEXT
        );
        CREATE INDEX IF NOT EXISTS local_outbox_events_status_idx
          ON local_outbox_events (status, created_at);
      `);
      return database as OutboxDatabase;
    })().catch((error: unknown) => {
      // Allow a later call to retry opening the encrypted store.
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function deserialize(row: StoredLocalOutboxEvent): LocalOutboxEvent {
  const { payload_json, ...rest } = row;
  return { ...rest, payload: JSON.parse(payload_json) as Record<string, unknown> };
}

/**
 * Persist an event locally for later replay. Idempotent per deduplication
 * key: a second enqueue with the same key merges its payload over the first,
 * so "latest state wins" for one-per-day events (sleep, stress, consents).
 */
export async function enqueueLocalOutboxEvent(
  userId: string,
  eventType: OutboxEventType,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  deduplicationKey?: string
): Promise<void> {
  const database = await getDatabase();
  // Same derivation as writeOutboxEvent so replay reuses the identical key.
  const dedupKey =
    deduplicationKey ??
    `${userId}:${eventType}:${aggregateId}:${new Date().toISOString().split("T")[0]}`;

  const existing = await database.getAllAsync<StoredLocalOutboxEvent>(
    "SELECT * FROM local_outbox_events WHERE deduplication_key = ? LIMIT 1",
    [dedupKey]
  );

  if (existing.length > 0) {
    const merged = {
      ...deserialize(existing[0]).payload,
      ...payload,
    };
    await database.runAsync(
      `UPDATE local_outbox_events
         SET payload_json = ?, status = 'pending', last_error_code = NULL
       WHERE deduplication_key = ?`,
      [JSON.stringify(merged), dedupKey]
    );
    return;
  }

  await database.runAsync(
    `INSERT INTO local_outbox_events (
       id, user_id, event_type, aggregate_type, aggregate_id,
       payload_json, deduplication_key, created_at, attempt_count, status, last_error_code
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', NULL)`,
    [
      randomUUID(),
      userId,
      eventType,
      aggregateType,
      aggregateId,
      JSON.stringify(payload),
      dedupKey,
      new Date().toISOString(),
    ]
  );
}

export async function countPendingLocalOutboxEvents(): Promise<number> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ pending: number }>(
    "SELECT COUNT(*) AS pending FROM local_outbox_events WHERE status = 'pending'",
    []
  );
  return rows[0]?.pending ?? 0;
}

export interface LocalOutboxSummary {
  /** Events waiting for a network window; they retry automatically. */
  pending: number;
  /** Events that hit MAX_REPLAY_ATTEMPTS non-network failures; they no longer retry automatically. */
  failed: number;
  /** The recorded error of the most recently enqueued failed event, if any. */
  lastFailureErrorCode: string | null;
}

/**
 * Honest device-queue status for the UI. Failed events are reported alongside
 * pending ones so terminal failures never vanish from view — a banner that
 * only counted pending rows would read as "synced" the moment an event
 * failed terminally.
 */
export async function getLocalOutboxSummary(): Promise<LocalOutboxSummary> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    status: string;
    last_error_code: string | null;
    created_at: string;
  }>(
    "SELECT status, last_error_code, created_at FROM local_outbox_events",
    []
  );

  let pending = 0;
  let failed = 0;
  let lastFailureErrorCode: string | null = null;
  let lastFailureCreatedAt = "";
  for (const row of rows) {
    if (row.status === "pending") {
      pending += 1;
    } else if (row.status === "failed") {
      failed += 1;
      if (row.created_at >= lastFailureCreatedAt) {
        lastFailureCreatedAt = row.created_at;
        lastFailureErrorCode = row.last_error_code;
      }
    }
  }
  return { pending, failed, lastFailureErrorCode };
}

/**
 * User-initiated recovery: put terminally-failed events back in the pending
 * queue with a fresh attempt budget so the next replay retries the real
 * write. Nothing is fabricated — if the underlying cause persists, the
 * events fail terminally again and are re-surfaced. Returns how many events
 * were reset.
 */
export async function retryFailedLocalOutboxEvents(): Promise<number> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ failed: number }>(
    "SELECT COUNT(*) AS failed FROM local_outbox_events WHERE status = 'failed'",
    []
  );
  const failed = rows[0]?.failed ?? 0;
  if (failed === 0) return 0;
  await database.runAsync(
    "UPDATE local_outbox_events SET status = 'pending', attempt_count = 0 WHERE status = 'failed'",
    []
  );
  return failed;
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function upsertRow(
  table: string,
  row: Record<string, unknown>,
  onConflict: string
): Promise<void> {
  const { error } = await supabase.from(table).upsert(row, { onConflict });
  throwIfError(error);
}

/**
 * "One row per user+date" tables (sleep_logs, daily_logs): update the
 * existing row for that date if the server already has one, otherwise insert
 * the queued row. Mirrors the online write path in daily-logs-service.
 */
async function upsertByUserAndDate(
  table: string,
  dateColumn: string,
  row: Record<string, unknown>
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", row.user_id as string)
    .eq(dateColumn, row[dateColumn] as string)
    .limit(1);
  throwIfError(readError);

  const existingId = (existing?.[0] as { id: string } | undefined)?.id;
  if (existingId) {
    const { id: _ignored, user_id: _user, ...updates } = row;
    const { error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", existingId);
    throwIfError(error);
    return;
  }

  const { error } = await supabase.from(table).insert(row);
  throwIfError(error);
}

async function replayConsentUpdate(event: LocalOutboxEvent): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("consent_settings")
    .select("id")
    .eq("user_id", event.user_id)
    .limit(1);
  throwIfError(readError);

  const updatedAt = new Date().toISOString();
  const existingId = (existing?.[0] as { id: string } | undefined)?.id;
  if (existingId) {
    const { error } = await supabase
      .from("consent_settings")
      .update({ ...event.payload, updated_at: updatedAt })
      .eq("id", existingId);
    throwIfError(error);
    return;
  }

  const { error } = await supabase.from("consent_settings").insert({
    id: randomUUID(),
    user_id: event.user_id,
    ...CONSENT_DEFAULTS,
    ...event.payload,
    updated_at: updatedAt,
  });
  throwIfError(error);
}

/** Re-execute the domain write a queued event represents. Idempotent. */
async function applyDomainWrite(event: LocalOutboxEvent): Promise<void> {
  switch (event.event_type) {
    case "sleep_log.created":
      await upsertByUserAndDate("sleep_logs", "log_date", event.payload);
      return;
    case "daily_log.updated":
      await upsertByUserAndDate("daily_logs", "log_date", event.payload);
      return;
    case "food_log.created":
      await upsertRow("food_logs", event.payload, "id");
      return;
    case "treatment_checkin.created":
      await upsertRow("treatment_checkins", event.payload, "id");
      return;
    case "skin_state.logged": {
      // acne_history is a one-row-per-user singleton (UNIQUE user_id) — the
      // web app and the mobile online path both upsert it by user_id, so
      // replay must too; upserting by id would insert a second row and hit
      // the unique violation. Strip any legacy enqueue-time row id so a
      // conflict never tries to rewrite the existing row's primary key.
      const { id: _legacyRowId, ...skinState } = event.payload;
      await upsertRow("acne_history", skinState, "user_id");
      return;
    }
    case "profile.updated":
      if (event.aggregate_type === "profile_section") {
        await upsertRow("profile_sections", event.payload, "user_id,section_key");
        return;
      }
      await upsertRow("profiles", event.payload, "user_id");
      return;
    case "onboarding.completed":
      await upsertRow(
        "profiles",
        {
          user_id: event.user_id,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        "user_id"
      );
      return;
    case "consent.updated":
      await replayConsentUpdate(event);
      return;
    default:
      throw new Error(`unsupported_outbox_event:${event.event_type as string}`);
  }
}

let replayInFlight = false;

export interface ReplayResult {
  replayed: number;
  remaining: number;
  /**
   * Events that hit terminal failure DURING this pass. Terminal events are
   * never re-selected, so a non-zero value marks the exact transition —
   * callers must surface it (alert/banner), never swallow it.
   */
  failed: number;
}

/**
 * Replay pending events oldest-first. Stops early when the network is (still)
 * unavailable; never marks anything done unless the real write succeeded.
 */
export async function replayPendingOutboxEvents(): Promise<ReplayResult> {
  if (replayInFlight) return { replayed: 0, remaining: 0, failed: 0 };
  replayInFlight = true;
  try {
    const database = await getDatabase();
    const rows = await database.getAllAsync<StoredLocalOutboxEvent>(
      `SELECT * FROM local_outbox_events
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 25`,
      []
    );
    if (rows.length === 0) return { replayed: 0, remaining: 0, failed: 0 };
    if (!(await isNetworkAvailable())) {
      return { replayed: 0, remaining: rows.length, failed: 0 };
    }

    let replayed = 0;
    let failed = 0;
    for (const stored of rows) {
      const event = deserialize(stored);
      try {
        await applyDomainWrite(event);
        // Mirror the event into the server-side outbox with the original
        // deduplication key (idempotent per outbox contract). Non-fatal by
        // contract: writeOutboxEvent warns instead of throwing.
        await writeOutboxEvent(
          event.user_id,
          event.event_type,
          event.aggregate_type,
          event.aggregate_id,
          event.payload,
          event.deduplication_key
        );
        await database.runAsync(
          "DELETE FROM local_outbox_events WHERE id = ?",
          [event.id]
        );
        replayed += 1;
      } catch (error) {
        if (isNetworkError(error)) break; // still offline — retry later
        const attempts = event.attempt_count + 1;
        const terminal = attempts >= MAX_REPLAY_ATTEMPTS;
        if (terminal) failed += 1;
        await database.runAsync(
          `UPDATE local_outbox_events
             SET attempt_count = ?, status = ?, last_error_code = ?
           WHERE id = ?`,
          [
            attempts,
            terminal ? "failed" : "pending",
            error instanceof Error ? error.message.slice(0, 200) : "unknown_error",
            event.id,
          ]
        );
      }
    }

    const remaining = await countPendingLocalOutboxEvents();
    return { replayed, remaining, failed };
  } finally {
    replayInFlight = false;
  }
}
