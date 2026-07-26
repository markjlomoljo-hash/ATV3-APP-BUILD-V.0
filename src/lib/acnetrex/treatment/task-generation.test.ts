import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db";
import {
  AM_DUE_TIME_UTC,
  PM_DUE_TIME_UTC,
  buildTaskInstances,
  extractPlanSteps,
  generateTreatmentTasks,
  generationKeyOf,
  planCoversUtcDay,
  taskGenerationRequestSchema,
} from "./task-generation";

const database = vi.mocked(getDb);
const userId = "00000000-0000-0000-0000-000000000001";
const planId = "11111111-1111-4111-8111-111111111111";
const date = "2026-07-26";

const activePlanRow = {
  id: planId,
  userId,
  title: "Clinician plan",
  description: null,
  schedule: {
    providerDirected: true,
    steps: [
      { name: "Cleanser", timeOfDay: "both" },
      { name: "Provider-directed treatment", timeOfDay: "pm" },
    ],
  },
  status: "active",
  startedAt: new Date("2026-07-20T00:00:00.000Z"),
  endedAt: null,
  createdAt: new Date("2026-07-20T00:00:00.000Z"),
  updatedAt: new Date("2026-07-20T00:00:00.000Z"),
};

function selectWhere(rows: unknown[]) {
  return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }) };
}

/**
 * Mocks the generation insert chain
 * insert().values().onConflictDoNothing().returning() and resolves RETURNING
 * with `returnedRows` — exactly what Postgres yields when conflicting rows
 * are suppressed by ON CONFLICT DO NOTHING.
 */
function insertChain(returnedRows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnedRows);
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoNothing });
  return { insert: vi.fn().mockReturnValue({ values }), values, onConflictDoNothing, returning };
}

describe("plan step extraction", () => {
  it("returns validated steps and strips unrelated schedule keys", () => {
    expect(extractPlanSteps(activePlanRow.schedule)).toEqual([
      { name: "Cleanser", timeOfDay: "both" },
      { name: "Provider-directed treatment", timeOfDay: "pm" },
    ]);
  });

  it("fails closed to no steps for missing or malformed configuration", () => {
    expect(extractPlanSteps(null)).toEqual([]);
    expect(extractPlanSteps(undefined)).toEqual([]);
    expect(extractPlanSteps({ providerDirected: true })).toEqual([]);
    expect(extractPlanSteps({ steps: [{ name: "", timeOfDay: "am" }] })).toEqual([]);
    expect(extractPlanSteps({ steps: [{ name: "X", timeOfDay: "noon" }] })).toEqual([]);
  });
});

describe("plan date coverage", () => {
  const base = { status: "active", startedAt: new Date("2026-07-20T00:00:00.000Z"), endedAt: null };

  it("covers days from the start day through the end day inclusive", () => {
    expect(planCoversUtcDay(base, "2026-07-20")).toBe(true);
    expect(planCoversUtcDay(base, "2026-07-19")).toBe(false);
    expect(planCoversUtcDay({ ...base, endedAt: new Date("2026-07-26T10:00:00.000Z") }, "2026-07-26")).toBe(true);
    expect(planCoversUtcDay({ ...base, endedAt: new Date("2026-07-25T23:59:59.000Z") }, "2026-07-26")).toBe(false);
  });

  it("never generates for non-active plans or plans without a real start date", () => {
    for (const status of ["draft", "paused", "completed", "abandoned"]) {
      expect(planCoversUtcDay({ ...base, status }, date)).toBe(false);
    }
    expect(planCoversUtcDay({ ...base, startedAt: null }, date)).toBe(false);
  });
});

describe("task instance building", () => {
  it("expands AM/PM cadence deterministically with documented UTC due times", () => {
    const instances = buildTaskInstances(activePlanRow, date);
    expect(instances).toHaveLength(3);
    expect(instances[0]).toMatchObject({
      planId,
      taskName: "Cleanser (AM)",
      metadata: {
        source: "plan_step_generation",
        generationKey: `${planId}:${date}:0:am`,
        stepIndex: 0,
        slot: "am",
        date,
      },
    });
    expect(instances[0].dueAt.toISOString()).toBe(`${date}T${AM_DUE_TIME_UTC}`);
    expect(instances[1].dueAt.toISOString()).toBe(`${date}T${PM_DUE_TIME_UTC}`);
    expect(instances[2]).toMatchObject({
      taskName: "Provider-directed treatment (PM)",
      metadata: { generationKey: `${planId}:${date}:1:pm`, slot: "pm" },
    });
    // Deterministic: identical inputs produce identical instances.
    expect(buildTaskInstances(activePlanRow, date)).toEqual(instances);
  });

  it("reads generation keys only from well-formed metadata", () => {
    expect(generationKeyOf({ generationKey: "a:b:0:am" })).toBe("a:b:0:am");
    expect(generationKeyOf({ generationKey: 7 })).toBeNull();
    expect(generationKeyOf(null)).toBeNull();
    expect(generationKeyOf("string")).toBeNull();
  });
});

describe("generateTreatmentTasks service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts owner-scoped tasks for every step slot of a covering plan", async () => {
    const insertedRows = buildTaskInstances(activePlanRow, date).map((instance, index) => ({
      id: `44444444-4444-4444-8444-44444444444${index}`,
      planId: instance.planId,
      userId,
      taskName: instance.taskName,
      dueAt: instance.dueAt,
      completedAt: null,
      skipped: false,
      metadata: instance.metadata,
      createdAt: new Date("2026-07-26T00:00:00.000Z"),
      updatedAt: new Date("2026-07-26T00:00:00.000Z"),
    }));
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([activePlanRow]))
      .mockReturnValueOnce(selectWhere([]));
    const chain = insertChain(insertedRows);
    database.mockReturnValue({ select, insert: chain.insert } as never);

    const result = await generateTreatmentTasks(userId, { date });

    expect(result.status).toBe("generated");
    expect(result.tasks).toHaveLength(3);
    expect(result.skippedExisting).toBe(0);
    expect(chain.values).toHaveBeenCalledWith([
      expect.objectContaining({ planId, userId, taskName: "Cleanser (AM)", skipped: false }),
      expect.objectContaining({ taskName: "Cleanser (PM)" }),
      expect.objectContaining({ taskName: "Provider-directed treatment (PM)" }),
    ]);
    // The DB-level backstop must be part of every generation insert.
    expect(chain.onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("re-runs idempotently: existing generation keys insert nothing", async () => {
    const existing = buildTaskInstances(activePlanRow, date).map((instance) => ({
      metadata: instance.metadata,
    }));
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([activePlanRow]))
      .mockReturnValueOnce(selectWhere(existing));
    const insert = vi.fn();
    database.mockReturnValue({ select, insert } as never);

    await expect(generateTreatmentTasks(userId, { date })).resolves.toEqual({
      status: "up_to_date",
      tasks: [],
      skippedExisting: 3,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("only backfills the missing slots when some tasks already exist", async () => {
    const [amInstance, ...missing] = buildTaskInstances(activePlanRow, date);
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([activePlanRow]))
      .mockReturnValueOnce(selectWhere([{ metadata: amInstance.metadata }]));
    const chain = insertChain(
      missing.map((instance, index) => ({
        id: `55555555-5555-4555-8555-55555555555${index}`,
        planId,
        userId,
        taskName: instance.taskName,
        dueAt: instance.dueAt,
        completedAt: null,
        skipped: false,
        metadata: instance.metadata,
        createdAt: new Date("2026-07-26T00:00:00.000Z"),
        updatedAt: new Date("2026-07-26T00:00:00.000Z"),
      })),
    );
    database.mockReturnValue({ select, insert: chain.insert } as never);

    const result = await generateTreatmentTasks(userId, { date });

    expect(result.status).toBe("generated");
    expect(result.skippedExisting).toBe(1);
    expect(chain.values).toHaveBeenCalledWith([
      expect.objectContaining({ taskName: "Cleanser (PM)" }),
      expect.objectContaining({ taskName: "Provider-directed treatment (PM)" }),
    ]);
  });

  it("reports rows lost to a concurrent generation race as skipped, not duplicated", async () => {
    // Two concurrent calls (different idempotency keys) both read an empty
    // key set. The other call wins the insert for 2 of the 3 rows; the
    // unique index suppresses them here and RETURNING yields only the row
    // this call actually inserted.
    const [wonInstance] = buildTaskInstances(activePlanRow, date);
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([activePlanRow]))
      .mockReturnValueOnce(selectWhere([]));
    const chain = insertChain([
      {
        id: "66666666-6666-4666-8666-666666666660",
        planId,
        userId,
        taskName: wonInstance.taskName,
        dueAt: wonInstance.dueAt,
        completedAt: null,
        skipped: false,
        metadata: wonInstance.metadata,
        createdAt: new Date("2026-07-26T00:00:00.000Z"),
        updatedAt: new Date("2026-07-26T00:00:00.000Z"),
      },
    ]);
    database.mockReturnValue({ select, insert: chain.insert } as never);

    const result = await generateTreatmentTasks(userId, { date });

    expect(result.status).toBe("generated");
    expect(result.tasks).toHaveLength(1);
    expect(result.skippedExisting).toBe(2);
    expect(chain.onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("reports up_to_date when a concurrent call already inserted every row", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([activePlanRow]))
      .mockReturnValueOnce(selectWhere([]));
    const chain = insertChain([]);
    database.mockReturnValue({ select, insert: chain.insert } as never);

    await expect(generateTreatmentTasks(userId, { date })).resolves.toEqual({
      status: "up_to_date",
      tasks: [],
      skippedExisting: 3,
    });
    expect(chain.onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("ships the partial unique index migration the ON CONFLICT backstop relies on", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260726093000_treatment_tasks_generation_key_unique.sql",
      ),
      "utf8",
    );
    const lowered = sql.toLowerCase();
    expect(lowered).toContain("create unique index if not exists");
    expect(lowered).toContain("on public.treatment_tasks");
    expect(lowered).toContain("user_id");
    // jsonb keys are case-sensitive: the index must target the exact key the
    // generation code writes.
    expect(sql).toContain("metadata ->> 'generationKey'");
    expect(lowered).toContain("is not null");
  });

  it("honestly reports no_active_plan when no plan covers the day", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([{ ...activePlanRow, status: "draft" }]));
    database.mockReturnValue({ select, insert: vi.fn() } as never);

    await expect(generateTreatmentTasks(userId, { date })).resolves.toEqual({
      status: "no_active_plan",
      tasks: [],
      skippedExisting: 0,
    });
  });

  it("honestly reports no_steps_defined instead of inventing routines", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([{ ...activePlanRow, schedule: { providerDirected: true } }]));
    database.mockReturnValue({ select, insert: vi.fn() } as never);

    await expect(generateTreatmentTasks(userId, { date })).resolves.toEqual({
      status: "no_steps_defined",
      tasks: [],
      skippedExisting: 0,
    });
  });

  it("throws a typed error for a plan the user does not own", async () => {
    const select = vi.fn().mockReturnValueOnce(selectWhere([]));
    database.mockReturnValue({ select } as never);

    await expect(generateTreatmentTasks(userId, { date, planId })).rejects.toThrow(
      "treatment_plan_not_found",
    );
  });

  it("validates the generation request shape", () => {
    expect(taskGenerationRequestSchema.safeParse({ date: "2026-07-26" }).success).toBe(true);
    expect(taskGenerationRequestSchema.safeParse({ date: "2026-13-01" }).success).toBe(false);
    expect(taskGenerationRequestSchema.safeParse({ date, planId: "not-a-uuid" }).success).toBe(false);
  });
});
