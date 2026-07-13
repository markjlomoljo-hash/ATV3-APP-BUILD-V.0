import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
vi.mock("@/lib/acnetrex/treatment/tasks", () => ({
  treatmentTaskCompletionSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
  completeTreatmentTask: vi.fn(),
}));

import { getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { completeTreatmentTask } from "@/lib/acnetrex/treatment/tasks";
import { PATCH } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const complete = vi.mocked(completeTreatmentTask);
const userId = "00000000-0000-0000-0000-000000000001";
const taskId = "22222222-2222-4222-8222-222222222222";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://example.test/api/treatments/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("treatment task completion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires an idempotency key", async () => {
    const response = await PATCH(request({ skipped: false }), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("persists completion for the authenticated owner", async () => {
    complete.mockResolvedValue({ id: taskId, skipped: false } as never);
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    const response = await PATCH(request({ skipped: false }, { "idempotency-key": "treatment-task-complete-01" }), {
      params: Promise.resolve({ id: taskId }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, task: { id: taskId, skipped: false } });
    expect(complete).toHaveBeenCalledWith(userId, taskId, { skipped: false });
  });

  it("maps an owner-scoped task miss to 404", async () => {
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    complete.mockRejectedValue(new Error("treatment_task_not_found"));
    const response = await PATCH(request({ skipped: true }, { "idempotency-key": "treatment-task-complete-02" }), {
      params: Promise.resolve({ id: taskId }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "treatment_task_not_found" });
  });
});
