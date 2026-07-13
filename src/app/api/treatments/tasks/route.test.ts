import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
vi.mock("@/lib/acnetrex/treatment/tasks", () => ({
  treatmentTaskRequestSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
  createTreatmentTask: vi.fn(),
  listTreatmentTasks: vi.fn(),
}));

import { getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { createTreatmentTask, listTreatmentTasks } from "@/lib/acnetrex/treatment/tasks";
import { GET, POST } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const create = vi.mocked(createTreatmentTask);
const list = vi.mocked(listTreatmentTasks);
const userId = "00000000-0000-0000-0000-000000000001";
const planId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/treatments/tasks", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("treatment task routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("returns owner-scoped tasks", async () => {
    list.mockResolvedValue([{ id: "22222222-2222-4222-8222-222222222222", planId, taskName: "Task" }] as never);
    const response = await GET(new Request(`https://example.test/api/treatments/tasks?planId=${planId}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, tasks: [{ planId, taskName: "Task" }] });
    expect(list).toHaveBeenCalledWith(userId, planId);
  });

  it("rejects invalid plan filters before querying", async () => {
    const response = await GET(new Request("https://example.test/api/treatments/tasks?planId=bad"));
    expect(response.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it("requires idempotency before accepting a task", async () => {
    const response = await POST(request({ planId, taskName: "Task" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("returns the persisted task reference", async () => {
    create.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", planId, taskName: "Task" } as never);
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    const response = await POST(request({ planId, taskName: "Task" }, { "idempotency-key": "treatment-task-route-01" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, task: { planId, taskName: "Task" } });
    expect(create).toHaveBeenCalledWith(userId, expect.objectContaining({ planId }));
  });

  it("maps an owner-plan miss to 404", async () => {
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    create.mockRejectedValue(new Error("treatment_plan_not_found"));
    const response = await POST(request({ planId, taskName: "Task" }, { "idempotency-key": "treatment-task-route-02" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "treatment_plan_not_found" });
  });
});
