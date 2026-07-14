import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
vi.mock("@/lib/acnetrex/treatment/plans", () => ({
  treatmentCheckinRequestSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
  createTreatmentCheckin: vi.fn(),
  listTreatmentCheckins: vi.fn(),
}));

import { getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { createTreatmentCheckin, listTreatmentCheckins } from "@/lib/acnetrex/treatment/plans";
import { GET, POST } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const create = vi.mocked(createTreatmentCheckin);
const list = vi.mocked(listTreatmentCheckins);
const userId = "00000000-0000-0000-0000-000000000001";
const planId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/treatments/checkins", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

describe("treatment check-in routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("rejects an invalid plan filter before querying", async () => {
    const response = await GET(new Request("https://example.test/api/treatments/checkins?planId=bad"));
    expect(response.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it("returns owner-scoped check-in history", async () => {
    list.mockResolvedValue([{ id: "22222222-2222-4222-8222-222222222222", planId, status: "used" }] as never);
    const response = await GET(new Request(`https://example.test/api/treatments/checkins?planId=${planId}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, checkins: [{ planId, status: "used" }] });
    expect(list).toHaveBeenCalledWith(userId, planId);
  });

  it("returns a typed unavailable state when check-in history cannot load", async () => {
    list.mockRejectedValue(new Error("connection refused"));
    const response = await GET(new Request("https://example.test/api/treatments/checkins"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_connection_refused" });
  });

  it("requires idempotency before accepting a check-in", async () => {
    const response = await POST(request({ planId, checkinDate: "2026-07-13", status: "used" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("returns a persisted check-in only after the service succeeds", async () => {
    create.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", planId, status: "used" } as never);
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    const response = await POST(request({ planId, checkinDate: "2026-07-13", status: "used", irritation: 2 }, { "idempotency-key": "treatment-checkin-route-01" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, checkin: { planId, status: "used" } });
    expect(create).toHaveBeenCalledWith(userId, expect.objectContaining({ planId }));
  });

  it("returns not-found when the selected plan is not owned by the user", async () => {
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    create.mockRejectedValue(new Error("treatment_plan_not_found"));
    const response = await POST(request({ planId, checkinDate: "2026-07-13", status: "used" }, { "idempotency-key": "treatment-checkin-route-02" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "treatment_plan_not_found" });
  });

  it("returns idempotency conflicts without claiming a check-in save", async () => {
    idempotent.mockRejectedValue(new Error("operation_in_progress"));
    const response = await POST(request({ planId, checkinDate: "2026-07-13", status: "used" }, { "idempotency-key": "treatment-checkin-route-03" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "operation_in_progress" });
    expect(create).not.toHaveBeenCalled();
  });
});
