import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
vi.mock("@/lib/acnetrex/treatment/plans", () => ({
  TreatmentSafetyError: class TreatmentSafetyError extends Error {},
  treatmentPlanRequestSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
  createTreatmentPlan: vi.fn(),
  listTreatmentPlans: vi.fn(),
}));

import { getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { TreatmentSafetyError, createTreatmentPlan, listTreatmentPlans } from "@/lib/acnetrex/treatment/plans";
import { GET, POST } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const create = vi.mocked(createTreatmentPlan);
const list = vi.mocked(listTreatmentPlans);
const userId = "00000000-0000-0000-0000-000000000001";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/treatments/plans", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

describe("treatment plan routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires authentication for history", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await GET(new Request("https://example.test/api/treatments/plans"));
    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it("returns owner-scoped history", async () => {
    list.mockResolvedValue([{ id: "11111111-1111-4111-8111-111111111111", title: "Clinician plan" }] as never);
    const response = await GET(new Request("https://example.test/api/treatments/plans"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, plans: [{ title: "Clinician plan" }] });
    expect(list).toHaveBeenCalledWith(userId);
  });

  it("returns a typed unavailable state when history cannot load", async () => {
    list.mockRejectedValue(new Error("connection refused"));
    const response = await GET(new Request("https://example.test/api/treatments/plans"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_connection_refused" });
  });

  it("requires an idempotency key before accepting a plan", async () => {
    const response = await POST(request({ name: "Retinoid", startDate: "2026-07-13", providerDirected: true }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("returns a saved owner-scoped plan reference", async () => {
    create.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", title: "Clinician plan", status: "active" } as never);
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    const response = await POST(request({ name: "Clinician plan", startDate: "2026-07-13", providerDirected: true }, { "idempotency-key": "treatment-plan-route-01" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, plan: { id: "11111111-1111-4111-8111-111111111111" } });
    expect(create).toHaveBeenCalledWith(userId, expect.objectContaining({ providerDirected: true }));
  });

  it("blocks non-provider-directed treatment plans", async () => {
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    create.mockRejectedValue(new TreatmentSafetyError("provider directed plan required"));
    const response = await POST(request({ name: "Self-directed plan", startDate: "2026-07-13", providerDirected: false }, { "idempotency-key": "treatment-plan-route-02" }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "provider_directed_treatment_required" });
  });

  it("returns idempotency conflicts without claiming a save", async () => {
    idempotent.mockRejectedValue(new Error("idempotency_key_reused_with_different_payload"));
    const response = await POST(request({ name: "Clinician plan", startDate: "2026-07-13", providerDirected: true }, { "idempotency-key": "treatment-plan-route-03" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_reused_with_different_payload" });
    expect(create).not.toHaveBeenCalled();
  });
});
