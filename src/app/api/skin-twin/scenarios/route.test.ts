import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
vi.mock("@/lib/acnetrex/skin-twin/scenarios", () => ({
  SkinTwinConsentRequiredError: class SkinTwinConsentRequiredError extends Error {},
  skinTwinScenarioRequestSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
  createSkinTwinScenario: vi.fn(),
  listSkinTwinScenarios: vi.fn(),
  getSkinTwinScenario: vi.fn(),
}));

import { getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { createSkinTwinScenario, listSkinTwinScenarios } from "@/lib/acnetrex/skin-twin/scenarios";
import { GET, POST } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const create = vi.mocked(createSkinTwinScenario);
const list = vi.mocked(listSkinTwinScenarios);
const userId = "00000000-0000-0000-0000-000000000001";
const snapshotId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/skin-twin/scenarios", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("Skin Twin scenario routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires auth for history", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await GET(new Request("https://example.test/api/skin-twin/scenarios"));
    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it("returns owner-scoped history when authenticated", async () => {
    list.mockResolvedValue([]);
    const response = await GET(new Request("https://example.test/api/skin-twin/scenarios"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, scenarios: [] });
    expect(list).toHaveBeenCalledWith(userId);
  });

  it("fails closed when history cannot reach the database", async () => {
    list.mockRejectedValue(new Error("connection refused"));
    const response = await GET(new Request("https://example.test/api/skin-twin/scenarios"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: "database_connection_refused" });
  });

  it("requires idempotency before accepting a scenario", async () => {
    const response = await POST(request({ name: "Sleep", window: "7d", variables: ["better_sleep"] }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("returns a persisted insufficient-data state without projection", async () => {
    create.mockResolvedValue({
      status: "insufficient_data",
      snapshot: { id: snapshotId, name: "Sleep", window: "7d", status: "insufficient_data", sourceRecordRefs: [], confidence: "insufficient_data", modelVersion: null, simulation: null, uncertainty: null, snapshotAt: "2026-07-13T00:00:00.000Z" },
    });
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    const response = await POST(request({ name: "Sleep", window: "7d", variables: ["better_sleep"] }, { "idempotency-key": "skin-twin-scenario-01" }));
    const payload = await response.json();
    expect(response.status).toBe(201);
    expect(payload).toMatchObject({ status: "insufficient_data", projection: null, snapshot: { id: snapshotId } });
  });
});
