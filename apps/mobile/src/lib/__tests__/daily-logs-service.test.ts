import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  let uuidCounter = 0;

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
    enqueued: [] as unknown[][],
    replayCalls: { count: 0 },
  };
});

vi.mock("expo-crypto", () => ({ randomUUID: state.nextUuid }));
vi.mock("expo-network", () => ({
  getNetworkStateAsync: async () => ({
    isConnected: state.network.online,
    isInternetReachable: state.network.online,
  }),
}));
vi.mock("../supabase", () => ({ supabase: state.supabase }));
vi.mock("../local-outbox", () => ({
  enqueueLocalOutboxEvent: async (...args: unknown[]) => {
    state.enqueued.push(args);
  },
  replayPendingOutboxEvents: async () => {
    state.replayCalls.count += 1;
    return { replayed: 0, remaining: 0 };
  },
  countPendingLocalOutboxEvents: async () => state.enqueued.length,
}));

import {
  logSleep,
  logSkinState,
  fetchLoggingStreak,
  fetchTodayLogs,
} from "../daily-logs-service";

const USER = "11111111-2222-3333-4444-555555555555";
const TODAY = new Date().toISOString().split("T")[0];

function dateStringDaysAgo(days: number): string {
  const d = new Date(`${TODAY}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split("T")[0];
}

beforeEach(() => {
  state.supabaseCalls.length = 0;
  state.enqueued.length = 0;
  state.replayCalls.count = 0;
  state.resetHandler();
  state.network.online = true;
});

describe("offline write fallback", () => {
  it("queues logSleep on-device without touching the server when offline", async () => {
    state.network.online = false;

    const outcome = await logSleep(USER, { quality: 4, notes: "ok" });

    expect(outcome).toEqual({ status: "queued_offline" });
    expect(state.supabaseCalls).toHaveLength(0);
    expect(state.enqueued).toHaveLength(1);
    const [userId, eventType, aggregateType, , payload, dedupKey] = state.enqueued[0];
    expect(userId).toBe(USER);
    expect(eventType).toBe("sleep_log.created");
    expect(aggregateType).toBe("sleep_log");
    expect(payload).toMatchObject({ user_id: USER, log_date: TODAY, quality: 4 });
    expect(dedupKey).toBe(`${USER}:sleep_log.created:${TODAY}`);
  });

  it("queues logSleep when the direct write fails with a network error", async () => {
    state.network.online = true;
    state.setHandler(() => ({
      data: null,
      error: { message: "TypeError: Network request failed" },
    }));

    const outcome = await logSleep(USER, { quality: 3 });

    expect(outcome).toEqual({ status: "queued_offline" });
    expect(state.enqueued).toHaveLength(1);
  });

  it("surfaces non-network failures instead of queueing (no fake success)", async () => {
    state.setHandler((call) => {
      if (call.ops.some(([op]) => op === "insert")) {
        return { data: null, error: { message: "permission denied for table sleep_logs" } };
      }
      return { data: [], error: null };
    });

    await expect(logSleep(USER, { quality: 3 })).rejects.toThrow(
      "sleep_log_insert_failed: permission denied for table sleep_logs"
    );
    expect(state.enqueued).toHaveLength(0);
  });

  it("saves online and then drains the pending queue", async () => {
    state.setHandler((call) => {
      if (call.table === "sleep_logs" && call.ops.some(([op]) => op === "insert")) {
        return { data: { id: "server-id", quality: 5 }, error: null };
      }
      return { data: [], error: null };
    });

    const outcome = await logSleep(USER, { quality: 5 });

    expect(outcome.status).toBe("saved");
    // Successful writes trigger a replay pass over the local outbox.
    await Promise.resolve();
    expect(state.replayCalls.count).toBe(1);
  });

  it("queues logSkinState into acne_history when offline", async () => {
    state.network.online = false;

    const outcome = await logSkinState(USER, { severity: "mild" });

    expect(outcome).toEqual({ status: "queued_offline" });
    const [, eventType, aggregateType, aggregateId, payload, dedupKey] =
      state.enqueued[0];
    expect(eventType).toBe("skin_state.logged");
    expect(aggregateType).toBe("acne_history");
    // acne_history is a one-row-per-user singleton: the aggregate is the
    // user, and the payload carries no client-generated row id — replay
    // upserts by user_id, so a fresh id would corrupt the existing row.
    expect(aggregateId).toBe(USER);
    expect(payload).toMatchObject({
      user_id: USER,
      severity: "mild",
      self_assessment: "mild",
    });
    expect(payload).not.toHaveProperty("id");
    expect(dedupKey).toBe(`${USER}:skin_state.logged:${TODAY}`);
  });
});

describe("logSkinState (acne_history singleton)", () => {
  it("upserts the singleton by user_id instead of inserting a row per day", async () => {
    state.setHandler((call) => {
      if (call.table === "acne_history") {
        const upsert = call.ops.find(([op]) => op === "upsert");
        return { data: upsert ? { id: "existing-row", user_id: USER } : [], error: null };
      }
      return { data: [], error: null };
    });

    const outcome = await logSkinState(USER, { severity: "moderate", notes: "flare" });

    expect(outcome.status).toBe("saved");
    const skinCall = state.supabaseCalls.find((c) => c.table === "acne_history");
    expect(skinCall).toBeDefined();
    const upsert = skinCall!.ops.find(([op]) => op === "upsert");
    expect(upsert).toBeDefined();
    const [row, options] = upsert![1] as [Record<string, unknown>, { onConflict: string }];
    expect(options).toEqual({ onConflict: "user_id" });
    expect(row).toMatchObject({
      user_id: USER,
      severity: "moderate",
      self_assessment: "moderate",
      notes: "flare",
    });
    // No client-generated id: the DB keeps the existing singleton's id.
    expect(row).not.toHaveProperty("id");
    // No insert path exists — insert would hit the UNIQUE (user_id) violation.
    expect(skinCall!.ops.some(([op]) => op === "insert")).toBe(false);
  });

  it('records "clear" in self_assessment without violating the severity enum', async () => {
    state.setHandler(() => ({ data: { id: "row" }, error: null }));

    await logSkinState(USER, { severity: "clear" });

    const skinCall = state.supabaseCalls.find((c) => c.table === "acne_history");
    const [row] = skinCall!.ops.find(([op]) => op === "upsert")![1] as [
      Record<string, unknown>
    ];
    // Web schema enum is mild | moderate | severe — "clear" must not be
    // written to severity, but the real observation is preserved verbatim.
    expect(row.severity).toBeNull();
    expect(row.self_assessment).toBe("clear");
  });

  it("leaves the singleton's notes untouched when the quick log has none", async () => {
    state.setHandler(() => ({ data: { id: "row" }, error: null }));

    await logSkinState(USER, { severity: "mild" });

    const skinCall = state.supabaseCalls.find((c) => c.table === "acne_history");
    const [row] = skinCall!.ops.find(([op]) => op === "upsert")![1] as [
      Record<string, unknown>
    ];
    expect(row).not.toHaveProperty("notes");
  });
});

describe("logSleep bed/wake times (SleepDerm input path)", () => {
  it("persists logged bed and wake times so sleep analysis has real input", async () => {
    state.setHandler((call) => {
      if (call.table === "sleep_logs" && call.ops.some(([op]) => op === "insert")) {
        return { data: { id: "server-id" }, error: null };
      }
      return { data: [], error: null };
    });

    const outcome = await logSleep(USER, {
      quality: 4,
      sleep_time: "23:30",
      wake_time: "07:00",
    });

    expect(outcome.status).toBe("saved");
    const insertCall = state.supabaseCalls.find(
      (c) => c.table === "sleep_logs" && c.ops.some(([op]) => op === "insert")
    );
    expect(insertCall).toBeDefined();
    const [row] = insertCall!.ops.find(([op]) => op === "insert")![1] as [
      Record<string, unknown>
    ];
    expect(row).toMatchObject({
      user_id: USER,
      log_date: TODAY,
      quality: 4,
      sleep_time: "23:30",
      wake_time: "07:00",
    });
  });

  it("does not erase previously logged times on a quality-only re-log", async () => {
    state.setHandler((call) => {
      if (call.table === "sleep_logs" && call.ops.some(([op]) => op === "select")) {
        return { data: [{ id: "existing-1" }], error: null };
      }
      return { data: { id: "existing-1" }, error: null };
    });

    await logSleep(USER, { quality: 2 });

    const updateCall = state.supabaseCalls.find(
      (c) => c.table === "sleep_logs" && c.ops.some(([op]) => op === "update")
    );
    expect(updateCall).toBeDefined();
    const [updates] = updateCall!.ops.find(([op]) => op === "update")![1] as [
      Record<string, unknown>
    ];
    expect(updates.quality).toBe(2);
    // Absent inputs are omitted, not nulled — real logged times survive.
    expect(updates).not.toHaveProperty("sleep_time");
    expect(updates).not.toHaveProperty("wake_time");
  });

  it("keeps times in the offline payload so replay persists them", async () => {
    state.network.online = false;

    await logSleep(USER, { quality: 5, sleep_time: "22:45", wake_time: "06:15" });

    const [, , , , payload] = state.enqueued[0];
    expect(payload).toMatchObject({
      sleep_time: "22:45",
      wake_time: "06:15",
      quality: 5,
    });
  });
});

describe("fetchTodayLogs", () => {
  it("reports skin state truthfully from acne_history instead of hardcoding false", async () => {
    state.setHandler((call) => {
      if (call.table === "acne_history") return { data: [{ id: "skin-1" }], error: null };
      if (call.table === "sleep_logs") return { data: [{ id: "sleep-1" }], error: null };
      return { data: [], error: null };
    });

    const summary = await fetchTodayLogs(USER);

    expect(summary.skinStateLogged).toBe(true);
    expect(summary.sleepLogged).toBe(true);
    expect(summary.logsCount).toBe(2); // sleep + skin state, nothing invented
  });

  it("derives skin state from the singleton's updated_at, not created_at", async () => {
    await fetchTodayLogs(USER);

    // acne_history is one row per user: created_at only marks the day the
    // row was first created, so "logged today" must read updated_at (the
    // daily quick log bumps it). A created_at filter would make the Today
    // module true only on the singleton's creation day.
    const skinCall = state.supabaseCalls.find((c) => c.table === "acne_history");
    expect(skinCall).toBeDefined();
    const gte = skinCall!.ops.find(([op]) => op === "gte");
    expect(gte).toBeDefined();
    expect(gte![1][0]).toBe("updated_at");
    expect(gte![1][1]).toBe(`${TODAY}T00:00:00.000Z`);
  });

  it("reports nothing logged when nothing exists", async () => {
    const summary = await fetchTodayLogs(USER);
    expect(summary.skinStateLogged).toBe(false);
    expect(summary.logsCount).toBe(0);
  });
});

describe("fetchLoggingStreak", () => {
  it("computes consecutive days from real log dates only", async () => {
    state.setHandler((call) => {
      if (call.table === "sleep_logs") {
        return { data: [{ log_date: TODAY }, { log_date: dateStringDaysAgo(1) }], error: null };
      }
      if (call.table === "daily_logs") {
        return { data: [{ log_date: dateStringDaysAgo(2) }], error: null };
      }
      if (call.table === "treatment_checkins") {
        // A gap: 4 days ago is NOT consecutive with the 0-1-2 run.
        return { data: [{ checkin_date: dateStringDaysAgo(4) }], error: null };
      }
      return { data: [], error: null };
    });

    const streak = await fetchLoggingStreak(USER);

    expect(streak.currentStreakDays).toBe(3);
    expect(streak.todayLogged).toBe(true);
    expect(streak.lastLogDate).toBe(TODAY);
  });

  it("keeps yesterday-ending streaks alive when today is not yet logged", async () => {
    state.setHandler((call) => {
      if (call.table === "food_logs") {
        return {
          data: [{ log_date: dateStringDaysAgo(1) }, { log_date: dateStringDaysAgo(2) }],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const streak = await fetchLoggingStreak(USER);

    expect(streak.currentStreakDays).toBe(2);
    expect(streak.todayLogged).toBe(false);
  });

  it("renders zero honestly for empty history — no seed values", async () => {
    const streak = await fetchLoggingStreak(USER);
    expect(streak.currentStreakDays).toBe(0);
    expect(streak.todayLogged).toBe(false);
    expect(streak.lastLogDate).toBeNull();
  });

  it("counts an old acne_history singleton updated today (no created_at window)", async () => {
    state.setHandler((call) => {
      if (call.table === "acne_history") {
        // Row created long before the window but updated by today's quick
        // log — a created_at >= since filter would wrongly drop it.
        return {
          data: [
            {
              created_at: `${dateStringDaysAgo(300)}T08:00:00.000Z`,
              updated_at: `${TODAY}T09:00:00.000Z`,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const streak = await fetchLoggingStreak(USER);

    expect(streak.todayLogged).toBe(true);
    expect(streak.currentStreakDays).toBe(1);
    const skinCall = state.supabaseCalls.find((c) => c.table === "acne_history");
    expect(skinCall!.ops.some(([op]) => op === "gte")).toBe(false);
  });

  it("fails instead of understating when history cannot be read", async () => {
    state.setHandler((call) => {
      if (call.table === "food_logs") {
        return { data: null, error: { message: "TypeError: Network request failed" } };
      }
      return { data: [], error: null };
    });

    await expect(fetchLoggingStreak(USER)).rejects.toThrow("streak_fetch_failed");
  });
});
