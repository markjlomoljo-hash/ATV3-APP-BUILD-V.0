import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db";
import {
  createTreatmentTask,
  completeTreatmentTask,
  listTreatmentTasks,
  treatmentTaskCompletionSchema,
  treatmentTaskRequestSchema,
} from "./tasks";

const database = vi.mocked(getDb);
const userId = "00000000-0000-0000-0000-000000000001";
const planId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";

const taskRow = {
  id: taskId,
  planId,
  userId,
  taskName: "Apply provider-directed treatment",
  dueAt: new Date("2026-07-14T08:00:00.000Z"),
  completedAt: null,
  skipped: false,
  metadata: { source: "treatment_plan" },
  createdAt: new Date("2026-07-13T00:00:00.000Z"),
  updatedAt: new Date("2026-07-13T00:00:00.000Z"),
};

function taskInput() {
  return treatmentTaskRequestSchema.parse({
    planId,
    taskName: "Apply provider-directed treatment",
    dueAt: "2026-07-14T08:00:00.000Z",
    metadata: { source: "treatment_plan" },
  });
}

describe("treatment task persistence service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a task only for an owner-scoped treatment plan", async () => {
    const planLimit = vi.fn().mockResolvedValue([{ id: planId }]);
    const planWhere = vi.fn().mockReturnValue({ limit: planLimit });
    const returning = vi.fn().mockResolvedValue([taskRow]);
    database.mockReturnValue({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: planWhere }) }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) }),
    } as never);
    const result = await createTreatmentTask(userId, taskInput());
    expect(result).toMatchObject({ id: taskId, planId, taskName: taskRow.taskName });
  });

  it("rejects a task when the plan is not owned by the user", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    database.mockReturnValue({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where }) }) } as never);
    await expect(createTreatmentTask(userId, taskInput())).rejects.toThrow("treatment_plan_not_found");
  });

  it("lists owner tasks with an optional plan filter", async () => {
    const orderBy = vi.fn().mockResolvedValue([taskRow]);
    const where = vi.fn().mockReturnValue({ orderBy });
    database.mockReturnValue({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where }) }) } as never);
    const result = await listTreatmentTasks(userId, planId);
    expect(result).toMatchObject([{ id: taskId, planId, skipped: false }]);
  });

  it("completes an owner task", async () => {
    const returning = vi.fn().mockResolvedValue([{ ...taskRow, completedAt: new Date("2026-07-13T10:00:00.000Z") }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    database.mockReturnValue({ update: vi.fn().mockReturnValue({ set }) } as never);
    const result = await completeTreatmentTask(userId, taskId, treatmentTaskCompletionSchema.parse({ skipped: false }));
    expect(result).toMatchObject({ id: taskId, skipped: false });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ skipped: false, completedAt: expect.any(Date) }));
  });

  it("returns a typed not-found error when completion is not owner-scoped", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    database.mockReturnValue({ update: vi.fn().mockReturnValue({ set }) } as never);
    await expect(completeTreatmentTask(userId, taskId, { skipped: true })).rejects.toThrow("treatment_task_not_found");
  });
});
