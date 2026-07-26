import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
// Keep the real request schema (payload rejection is part of this route's
// contract) and mock only the generation service.
vi.mock("@/lib/acnetrex/treatment/task-generation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/acnetrex/treatment/task-generation")>()),
  generateTreatmentTasks: vi.fn(),
}));

import { DatabaseConfigurationError, getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { generateTreatmentTasks } from "@/lib/acnetrex/treatment/task-generation";
import { POST } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const generate = vi.mocked(generateTreatmentTasks);
const userId = "00000000-0000-0000-0000-000000000001";
const planId = "11111111-1111-4111-8111-111111111111";
const date = "2026-07-26";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/treatments/tasks/generate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("treatment task generation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
  });

  it("requires authentication before generating", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await POST(request({ date }, { "idempotency-key": "task-generation-route-01" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_required" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("requires an idempotency key before generating", async () => {
    const response = await POST(request({ date }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects malformed generation payloads before touching the database", async () => {
    for (const body of [{ date: "2026-13-01" }, { date, planId: "not-a-uuid" }, {}]) {
      const response = await POST(request(body, { "idempotency-key": "task-generation-route-02" }));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ ok: false, error: "invalid_task_generation_payload" });
    }
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns 201 with the owner-scoped generated tasks", async () => {
    generate.mockResolvedValue({
      status: "generated",
      tasks: [{ id: "22222222-2222-4222-8222-222222222222", planId, taskName: "Cleanser (AM)" }],
      skippedExisting: 0,
    } as never);
    const response = await POST(request({ date, planId }, { "idempotency-key": "task-generation-route-03" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      generation: { status: "generated", tasks: [{ taskName: "Cleanser (AM)" }] },
    });
    expect(generate).toHaveBeenCalledWith(userId, { date, planId });
    expect(idempotent).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: userId, scope: "treatment-task-generation", key: "task-generation-route-03" }),
    );
  });

  it("returns 200 for honest non-generating outcomes", async () => {
    for (const status of ["no_active_plan", "no_steps_defined", "up_to_date"] as const) {
      generate.mockResolvedValue({ status, tasks: [], skippedExisting: 0 } as never);
      const response = await POST(request({ date }, { "idempotency-key": `task-generation-route-04-${status}` }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ ok: true, generation: { status } });
    }
  });

  it("maps an owner-plan miss to 404", async () => {
    generate.mockRejectedValue(new Error("treatment_plan_not_found"));
    const response = await POST(request({ date, planId }, { "idempotency-key": "task-generation-route-05" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "treatment_plan_not_found" });
  });

  it("returns idempotency conflicts without claiming a generation", async () => {
    idempotent.mockRejectedValue(new Error("idempotency_key_reused_with_different_payload"));
    const response = await POST(request({ date }, { "idempotency-key": "task-generation-route-06" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_reused_with_different_payload" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("reports database_unavailable when the database is not configured", async () => {
    database.mockImplementation(() => {
      throw new DatabaseConfigurationError();
    });
    const response = await POST(request({ date }, { "idempotency-key": "task-generation-route-07" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_unavailable" });
  });
});
