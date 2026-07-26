import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  getPool: vi.fn(),
}));

import { getPool } from "@/db";
import { computeSleepWindow, createDailyLogEntry, listDailyLogEntries } from "./service";

const pool = vi.mocked(getPool);
const userId = "00000000-0000-0000-0000-000000000001";

function clientWithResponses(responses: Array<{ rows?: unknown[]; rowCount?: number }>) {
  const query = vi.fn(async (..._args: unknown[]) => responses.shift() ?? { rows: [] });
  const client = { query } as unknown as PoolClient;
  return { client, query };
}

describe("computeSleepWindow", () => {
  it("assigns bedtime to the previous calendar day when the window crosses midnight", () => {
    expect(computeSleepWindow("2026-07-25", "23:30", "07:10")).toEqual({
      sleepTime: "2026-07-24T23:30:00.000Z",
      wakeTime: "2026-07-25T07:10:00.000Z",
      crossedMidnight: true,
    });
  });

  it("keeps an after-midnight bedtime on the log date", () => {
    expect(computeSleepWindow("2026-07-25", "01:00", "07:00")).toEqual({
      sleepTime: "2026-07-25T01:00:00.000Z",
      wakeTime: "2026-07-25T07:00:00.000Z",
      crossedMidnight: false,
    });
  });

  it("returns nulls when clock times were not provided (never invented)", () => {
    expect(computeSleepWindow("2026-07-25")).toEqual({
      sleepTime: null,
      wakeTime: null,
      crossedMidnight: false,
    });
  });
});

describe("createDailyLogEntry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts sleep into public.sleep_logs keyed by user and log date", async () => {
    const { client, query } = clientWithResponses([
      {
        rows: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            logDate: "2026-07-25",
            sleepTime: new Date("2026-07-24T23:30:00.000Z"),
            wakeTime: new Date("2026-07-25T07:10:00.000Z"),
            quality: 4,
            notes: null,
            recordedAt: new Date("2026-07-25T08:00:00.000Z"),
          },
        ],
      },
    ]);

    const entry = await createDailyLogEntry(client, userId, "sleep", {
      logDate: "2026-07-25",
      bedtime: "23:30",
      wakeTime: "07:10",
      quality: 4,
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("insert into public.sleep_logs");
    expect(sql).toContain("on conflict (user_id, log_date)");
    expect(params[0]).toBe(userId);
    expect(params[1]).toBe("2026-07-25");
    expect(params[2]).toBe("2026-07-24T23:30:00.000Z");
    expect(params[3]).toBe("2026-07-25T07:10:00.000Z");
    expect(params[4]).toBe(4);
    expect(entry).toMatchObject({
      kind: "sleep",
      logDate: "2026-07-25",
      values: {
        quality: 4,
        sleepTime: "2026-07-24T23:30:00.000Z",
        wakeTime: "2026-07-25T07:10:00.000Z",
      },
    });
  });

  it("appends a snack as a snack_events sub-event on the day's food_logs row", async () => {
    const { client, query } = clientWithResponses([
      {
        rows: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            logDate: "2026-07-25",
            mealEvents: [],
            snackEvents: [{ type: "snack", description: "chocolate bar" }],
            expectedMealCount: null,
            completionState: "partially_logged",
            notes: null,
            recordedAt: new Date("2026-07-25T15:00:00.000Z"),
          },
        ],
      },
    ]);

    const entry = await createDailyLogEntry(client, userId, "food", {
      logDate: "2026-07-25",
      entryType: "snack",
      description: "chocolate bar",
      categories: ["sugary_snack"],
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("insert into public.food_logs");
    expect(sql).toContain("on conflict (user_id, log_date)");
    expect(sql).toContain("snack_events");
    expect(params[2]).toBe(true); // snack flag
    const event = JSON.parse(String(params[3]));
    expect(event).toMatchObject({
      type: "snack",
      description: "chocolate bar",
      categories: ["sugary_snack"],
      source: "web",
    });
    expect(typeof event.id).toBe("string");
    expect(entry.kind).toBe("food");
    expect(entry.values.snackEvents).toHaveLength(1);
  });

  it("flags meals (not snacks) so they append into meal_events", async () => {
    const { client, query } = clientWithResponses([
      {
        rows: [
          {
            id: "22222222-2222-4222-8222-222222222223",
            logDate: "2026-07-25",
            mealEvents: [{ type: "breakfast" }],
            snackEvents: [],
            expectedMealCount: 3,
            completionState: "partially_logged",
            notes: null,
            recordedAt: new Date("2026-07-25T08:30:00.000Z"),
          },
        ],
      },
    ]);

    await createDailyLogEntry(client, userId, "food", {
      logDate: "2026-07-25",
      entryType: "breakfast",
      description: "oatmeal",
      categories: [],
      expectedMealCount: 3,
    });

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[2]).toBe(false);
    expect(params[4]).toBe(3);
  });

  it("updates the existing daily_logs row for stress instead of duplicating the day", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ id: "existing-day" }] },
      {
        rows: [
          {
            id: "existing-day",
            logDate: "2026-07-25",
            stressLevel: 7,
            notes: "deadline",
            recordedAt: new Date("2026-07-25T20:00:00.000Z"),
          },
        ],
      },
    ]);

    const entry = await createDailyLogEntry(client, userId, "stress", {
      logDate: "2026-07-25",
      stressLevel: 7,
      notes: "deadline",
    });

    const [selectSql] = query.mock.calls[0] as [string, unknown[]];
    expect(selectSql).toContain("from public.daily_logs");
    expect(selectSql).toContain("for update");
    const [updateSql, updateParams] = query.mock.calls[1] as [string, unknown[]];
    expect(updateSql).toContain("update public.daily_logs");
    expect(updateSql).toContain("stress_level");
    expect(updateParams[0]).toBe(7);
    expect(updateParams[3]).toBe("existing-day");
    expect(entry.values.stressLevel).toBe(7);
  });

  it("inserts a new daily_logs row for stress when the day has none", async () => {
    const { client, query } = clientWithResponses([
      { rows: [] },
      {
        rows: [
          {
            id: "new-day",
            logDate: "2026-07-25",
            stressLevel: 4,
            notes: null,
            recordedAt: new Date("2026-07-25T20:00:00.000Z"),
          },
        ],
      },
    ]);

    await createDailyLogEntry(client, userId, "stress", { logDate: "2026-07-25", stressLevel: 4 });

    const [insertSql, insertParams] = query.mock.calls[1] as [string, unknown[]];
    expect(insertSql).toContain("insert into public.daily_logs");
    expect(insertParams).toEqual([userId, "2026-07-25", 4, null]);
  });

  it("namespaces hydration under its own key in the daily context container", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ id: "existing-day" }] },
      {
        rows: [
          {
            id: "existing-day",
            logDate: "2026-07-25",
            activity: { hydration: { volumeMl: 1500, source: "web" }, contact: { exposures: ["mask"] } },
            recordedAt: new Date("2026-07-25T21:00:00.000Z"),
          },
        ],
      },
    ]);

    const entry = await createDailyLogEntry(client, userId, "hydration", {
      logDate: "2026-07-25",
      volumeMl: 1500,
    });

    const [updateSql, updateParams] = query.mock.calls[1] as [string, unknown[]];
    expect(updateSql).toContain("jsonb_typeof(activity) = 'object'");
    const patch = JSON.parse(String(updateParams[0]));
    expect(Object.keys(patch)).toEqual(["hydration"]);
    expect(patch.hydration).toMatchObject({ volumeMl: 1500, source: "web" });
    expect(patch.hydration.logDate).toBeUndefined();
    expect(entry.values).toMatchObject({ volumeMl: 1500 });
  });

  it("stores 'clear' skin state verbatim without coercing it into a severity grade", async () => {
    const { client, query } = clientWithResponses([
      {
        rows: [
          {
            id: "singleton",
            severity: null,
            selfAssessment: "clear",
            notes: null,
            recordedAt: new Date("2026-07-25T09:00:00.000Z"),
          },
        ],
      },
    ]);

    const entry = await createDailyLogEntry(client, userId, "skin-state", { severity: "clear" });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("insert into public.acne_history");
    expect(sql).toContain("on conflict (user_id)");
    expect(params[1]).toBeNull(); // severity
    expect(params[2]).toBe("clear"); // self_assessment verbatim
    expect(entry.values).toEqual({ severity: null, selfAssessment: "clear" });
  });

  it("keeps real severities in the severity column", async () => {
    const { client, query } = clientWithResponses([
      {
        rows: [
          {
            id: "singleton",
            severity: "moderate",
            selfAssessment: "moderate",
            notes: null,
            recordedAt: new Date("2026-07-25T09:00:00.000Z"),
          },
        ],
      },
    ]);

    await createDailyLogEntry(client, userId, "skin-state", { severity: "moderate" });
    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe("moderate");
  });
});

describe("listDailyLogEntries", () => {
  beforeEach(() => vi.clearAllMocks());

  function poolWithResponses(responses: Array<{ rows: unknown[] }>) {
    const query = vi.fn(async (..._args: unknown[]) => responses.shift() ?? { rows: [] });
    pool.mockReturnValue({ query } as never);
    return query;
  }

  it("returns an empty history instead of inventing records", async () => {
    poolWithResponses([{ rows: [] }]);
    await expect(listDailyLogEntries(userId, "stress")).resolves.toEqual([]);
  });

  it("reads sleep history from sleep_logs owner-scoped and date-ordered", async () => {
    const query = poolWithResponses([
      {
        rows: [
          {
            id: "row-1",
            logDate: "2026-07-25",
            sleepTime: new Date("2026-07-24T23:30:00.000Z"),
            wakeTime: new Date("2026-07-25T07:10:00.000Z"),
            quality: 4,
            notes: null,
            recordedAt: new Date("2026-07-25T08:00:00.000Z"),
          },
        ],
      },
    ]);

    const entries = await listDailyLogEntries(userId, "sleep", 14);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("from public.sleep_logs");
    expect(sql).toContain("order by log_date desc");
    expect(params).toEqual([userId, 14]);
    expect(entries[0]).toMatchObject({ kind: "sleep", logDate: "2026-07-25" });
  });

  it("filters context history to rows that actually contain the kind", async () => {
    const query = poolWithResponses([
      {
        rows: [
          {
            id: "row-1",
            logDate: "2026-07-25",
            activity: { routine: { stepsCompleted: ["cleanser_am"], productChangeIntroduced: false } },
            recordedAt: new Date("2026-07-25T21:00:00.000Z"),
          },
        ],
      },
    ]);

    const entries = await listDailyLogEntries(userId, "routine");
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("(activity -> $2::text) is not null");
    expect(params).toEqual([userId, "routine", 30]);
    expect(entries[0]).toMatchObject({
      kind: "routine",
      values: { stepsCompleted: ["cleanser_am"] },
    });
  });

  it("returns at most the singleton row for skin-state", async () => {
    const query = poolWithResponses([
      {
        rows: [
          {
            id: "singleton",
            severity: null,
            selfAssessment: "clear",
            notes: "from onboarding",
            recordedAt: new Date("2026-07-25T09:00:00.000Z"),
          },
        ],
      },
    ]);

    const entries = await listDailyLogEntries(userId, "skin-state");
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("from public.acne_history");
    expect(sql).toContain("limit 1");
    expect(entries).toHaveLength(1);
    expect(entries[0].logDate).toBeNull();
  });

  it("bounds the requested limit to the 1-100 contract", async () => {
    const query = poolWithResponses([{ rows: [] }]);
    await listDailyLogEntries(userId, "food", 5000);
    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe(100);
  });
});
