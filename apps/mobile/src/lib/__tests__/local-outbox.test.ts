import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted shared test state ────────────────────────────────────────────────

const state = vi.hoisted(() => {
  interface FakeRow {
    id: string;
    user_id: string;
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    payload_json: string;
    deduplication_key: string;
    created_at: string;
    attempt_count: number;
    status: string;
    last_error_code: string | null;
  }

  const rows: FakeRow[] = [];
  let uuidCounter = 0;

  const fakeDb = {
    async execAsync() {
      /* schema creation no-op */
    },
    async runAsync(sql: string, params: (string | number | null)[]) {
      if (sql.includes("INSERT INTO local_outbox_events")) {
        rows.push({
          id: String(params[0]),
          user_id: String(params[1]),
          event_type: String(params[2]),
          aggregate_type: String(params[3]),
          aggregate_id: String(params[4]),
          payload_json: String(params[5]),
          deduplication_key: String(params[6]),
          created_at: String(params[7]),
          attempt_count: 0,
          status: "pending",
          last_error_code: null,
        });
      } else if (sql.includes("SET payload_json")) {
        const row = rows.find((r) => r.deduplication_key === params[1]);
        if (row) {
          row.payload_json = String(params[0]);
          row.status = "pending";
          row.last_error_code = null;
        }
      } else if (sql.includes("SET attempt_count")) {
        const row = rows.find((r) => r.id === params[3]);
        if (row) {
          row.attempt_count = Number(params[0]);
          row.status = String(params[1]);
          row.last_error_code = params[2] === null ? null : String(params[2]);
        }
      } else if (sql.includes("SET status = 'pending', attempt_count = 0")) {
        for (const row of rows) {
          if (row.status === "failed") {
            row.status = "pending";
            row.attempt_count = 0;
          }
        }
      } else if (sql.startsWith("DELETE")) {
        const index = rows.findIndex((r) => r.id === params[0]);
        if (index >= 0) rows.splice(index, 1);
      }
    },
    async getAllAsync(sql: string, params: (string | number | null)[]) {
      if (sql.includes("COUNT(*)")) {
        if (sql.includes("status = 'failed'")) {
          return [{ failed: rows.filter((r) => r.status === "failed").length }];
        }
        return [{ pending: rows.filter((r) => r.status === "pending").length }];
      }
      if (sql.includes("SELECT status, last_error_code, created_at")) {
        return rows.map((r) => ({
          status: r.status,
          last_error_code: r.last_error_code,
          created_at: r.created_at,
        }));
      }
      if (sql.includes("WHERE deduplication_key")) {
        return rows.filter((r) => r.deduplication_key === params[0]).slice(0, 1);
      }
      if (sql.includes("WHERE status = 'pending'")) {
        return rows
          .filter((r) => r.status === "pending")
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .slice(0, 25);
      }
      return [];
    },
  };

  // Recording supabase mock. Each awaited chain resolves through `handler`.
  type Call = { table: string; ops: [string, unknown[]][] };
  const supabaseCalls: Call[] = [];
  let handler: (call: Call) => { data?: unknown; error: { message: string } | null } = () => ({
    data: null,
    error: null,
  });

  function makeBuilder(table: string) {
    const call: Call = { table, ops: [] };
    supabaseCalls.push(call);
    const builder: Record<string, unknown> = {};
    for (const method of [
      "select",
      "eq",
      "gte",
      "in",
      "limit",
      "order",
      "single",
      "insert",
      "update",
      "upsert",
    ]) {
      builder[method] = (...args: unknown[]) => {
        call.ops.push([method, args]);
        return builder;
      };
    }
    (builder as { then: unknown }).then = (
      resolve: (value: unknown) => unknown
    ) => resolve(handler(call));
    return builder;
  }

  return {
    rows,
    fakeDb,
    supabaseCalls,
    setHandler(next: typeof handler) {
      handler = next;
    },
    resetHandler() {
      handler = () => ({ data: null, error: null });
    },
    supabase: { from: (table: string) => makeBuilder(table) },
    nextUuid: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, "0")}`,
    network: { online: true },
  };
});

vi.mock("expo-crypto", () => ({ randomUUID: state.nextUuid }));
vi.mock("expo-network", () => ({
  getNetworkStateAsync: async () => ({
    isConnected: state.network.online,
    isInternetReachable: state.network.online,
  }),
}));
vi.mock("../private-database", () => ({
  openPrivateDatabase: async () => state.fakeDb,
}));
vi.mock("../supabase", () => ({ supabase: state.supabase }));

import {
  enqueueLocalOutboxEvent,
  countPendingLocalOutboxEvents,
  getLocalOutboxSummary,
  replayPendingOutboxEvents,
  retryFailedLocalOutboxEvents,
} from "../local-outbox";

const USER = "11111111-2222-3333-4444-555555555555";

beforeEach(() => {
  state.rows.length = 0;
  state.supabaseCalls.length = 0;
  state.resetHandler();
  state.network.online = true;
});

describe("enqueueLocalOutboxEvent", () => {
  it("persists an event with the outbox contract fields", async () => {
    await enqueueLocalOutboxEvent(
      USER,
      "food_log.created",
      "food_log",
      "row-1",
      { id: "row-1", user_id: USER, items: { description: "oats" } },
      `${USER}:food_log.created:row-1`
    );

    expect(await countPendingLocalOutboxEvents()).toBe(1);
    const stored = state.rows[0];
    expect(stored.event_type).toBe("food_log.created");
    expect(stored.aggregate_type).toBe("food_log");
    expect(stored.deduplication_key).toBe(`${USER}:food_log.created:row-1`);
    expect(JSON.parse(stored.payload_json)).toMatchObject({ id: "row-1", user_id: USER });
    expect(stored.status).toBe("pending");
    expect(stored.attempt_count).toBe(0);
  });

  it("is idempotent per deduplication key with latest-state-wins payload merge", async () => {
    const dedup = `${USER}:sleep_log.created:2026-07-26`;
    await enqueueLocalOutboxEvent(USER, "sleep_log.created", "sleep_log", "a", { quality: 2 }, dedup);
    await enqueueLocalOutboxEvent(USER, "sleep_log.created", "sleep_log", "b", { quality: 5 }, dedup);

    expect(await countPendingLocalOutboxEvents()).toBe(1);
    expect(JSON.parse(state.rows[0].payload_json)).toEqual({ quality: 5 });
  });
});

describe("replayPendingOutboxEvents", () => {
  it("replays the domain write and mirrors the outbox event with the original dedup key", async () => {
    const dedup = `${USER}:food_log.created:row-9`;
    const payload = { id: "row-9", user_id: USER, log_date: "2026-07-26", completed: true };
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "row-9", payload, dedup);

    const outboxInserts: Record<string, unknown>[] = [];
    state.setHandler((call) => {
      if (call.table === "outbox_events") {
        const insert = call.ops.find(([op]) => op === "insert");
        if (insert) outboxInserts.push(insert[1][0] as Record<string, unknown>);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    });

    const result = await replayPendingOutboxEvents();

    expect(result.replayed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(await countPendingLocalOutboxEvents()).toBe(0);

    // Domain write went to the real table with the enqueue-time row id.
    const foodCall = state.supabaseCalls.find((c) => c.table === "food_logs");
    expect(foodCall).toBeDefined();
    const upsert = foodCall!.ops.find(([op]) => op === "upsert");
    expect(upsert).toBeDefined();
    expect(upsert![1][0]).toMatchObject({ id: "row-9", user_id: USER });

    // Outbox mirror reused the exact deduplication key from enqueue time.
    expect(outboxInserts).toHaveLength(1);
    expect(outboxInserts[0]).toMatchObject({
      event_type: "food_log.created",
      deduplication_key: dedup,
      user_id: USER,
    });
  });

  it("replays skin_state.logged as an acne_history upsert by user_id (singleton)", async () => {
    // acne_history is one row per user (UNIQUE user_id): replay must update
    // that row, never insert a fresh one. A legacy enqueue-time row id in
    // the payload is stripped so a conflict cannot rewrite the primary key.
    await enqueueLocalOutboxEvent(
      USER,
      "skin_state.logged",
      "acne_history",
      USER,
      {
        id: "legacy-row-id",
        user_id: USER,
        severity: null,
        self_assessment: "clear",
        updated_at: "2026-07-26T09:00:00.000Z",
      },
      `${USER}:skin_state.logged:2026-07-26`
    );

    const result = await replayPendingOutboxEvents();

    expect(result.replayed).toBe(1);
    const skinCall = state.supabaseCalls.find((c) => c.table === "acne_history");
    expect(skinCall).toBeDefined();
    const upsert = skinCall!.ops.find(([op]) => op === "upsert");
    expect(upsert).toBeDefined();
    const [row, options] = upsert![1] as [
      Record<string, unknown>,
      { onConflict: string }
    ];
    expect(options).toEqual({ onConflict: "user_id" });
    expect(row).toMatchObject({
      user_id: USER,
      severity: null,
      self_assessment: "clear",
    });
    expect(row).not.toHaveProperty("id");
  });

  it("leaves everything pending and untouched while offline", async () => {
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "r", { id: "r" });
    state.network.online = false;
    state.supabaseCalls.length = 0;

    const result = await replayPendingOutboxEvents();

    expect(result.replayed).toBe(0);
    expect(result.remaining).toBe(1);
    expect(state.supabaseCalls).toHaveLength(0);
    expect(state.rows[0].attempt_count).toBe(0);
  });

  it("keeps the event pending without burning attempts on a mid-replay network drop", async () => {
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "r", { id: "r" });
    state.setHandler(() => ({
      data: null,
      error: { message: "TypeError: Network request failed" },
    }));

    const result = await replayPendingOutboxEvents();

    expect(result.replayed).toBe(0);
    expect(state.rows[0].status).toBe("pending");
    expect(state.rows[0].attempt_count).toBe(0);
  });

  it("records real (non-network) failures honestly and fails terminal after max attempts", async () => {
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "r", { id: "r" });
    state.setHandler(() => ({
      data: null,
      error: { message: "permission denied for table food_logs" },
    }));

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await replayPendingOutboxEvents();
      expect(state.rows[0].attempt_count).toBe(attempt);
      // ReplayResult.failed marks exactly the pass where the event became
      // terminal — the caller alerts on that transition, never before.
      expect(result.failed).toBe(attempt === 5 ? 1 : 0);
    }

    expect(state.rows[0].status).toBe("failed");
    expect(state.rows[0].last_error_code).toContain("permission denied");
    // Failed events no longer count as pending and are not retried.
    expect(await countPendingLocalOutboxEvents()).toBe(0);
    const result = await replayPendingOutboxEvents();
    expect(result.replayed).toBe(0);
    expect(result.failed).toBe(0);
  });
});

describe("failure surfacing and recovery", () => {
  async function failTerminally(): Promise<void> {
    state.setHandler(() => ({
      data: null,
      error: { message: "permission denied for table food_logs" },
    }));
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await replayPendingOutboxEvents();
    }
  }

  it("getLocalOutboxSummary keeps terminally-failed events visible with their error", async () => {
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "r", { id: "r" });
    await failTerminally();

    // Pending count alone would read as "all synced" — the summary must not.
    expect(await countPendingLocalOutboxEvents()).toBe(0);
    const summary = await getLocalOutboxSummary();
    expect(summary.pending).toBe(0);
    expect(summary.failed).toBe(1);
    expect(summary.lastFailureErrorCode).toContain("permission denied");
  });

  it("summary counts pending and failed independently", async () => {
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "a", { id: "a" });
    await failTerminally();
    state.network.online = false;
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "b", { id: "b" });

    const summary = await getLocalOutboxSummary();
    expect(summary.pending).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it("retryFailedLocalOutboxEvents resets failed events so a real replay can drain them", async () => {
    const dedup = `${USER}:food_log.created:r`;
    await enqueueLocalOutboxEvent(
      USER,
      "food_log.created",
      "food_log",
      "r",
      { id: "r", user_id: USER },
      dedup
    );
    await failTerminally();
    expect((await getLocalOutboxSummary()).failed).toBe(1);

    const reset = await retryFailedLocalOutboxEvents();
    expect(reset).toBe(1);
    expect(state.rows[0].status).toBe("pending");
    expect(state.rows[0].attempt_count).toBe(0);
    expect((await getLocalOutboxSummary()).pending).toBe(1);

    // Cause resolved: the retried event syncs for real and leaves the queue.
    state.resetHandler();
    const result = await replayPendingOutboxEvents();
    expect(result.replayed).toBe(1);
    expect(result.failed).toBe(0);
    const summary = await getLocalOutboxSummary();
    expect(summary.pending).toBe(0);
    expect(summary.failed).toBe(0);
  });

  it("retryFailedLocalOutboxEvents is a no-op without failed events", async () => {
    await enqueueLocalOutboxEvent(USER, "food_log.created", "food_log", "r", { id: "r" });
    expect(await retryFailedLocalOutboxEvents()).toBe(0);
    expect(state.rows[0].status).toBe("pending");
  });
});
