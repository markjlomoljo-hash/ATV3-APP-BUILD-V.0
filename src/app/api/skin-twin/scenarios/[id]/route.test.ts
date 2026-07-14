import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/acnetrex/skin-twin/scenarios", () => ({ getSkinTwinScenario: vi.fn() }));

import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { getSkinTwinScenario } from "@/lib/acnetrex/skin-twin/scenarios";
import { GET } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const getScenario = vi.mocked(getSkinTwinScenario);
const userId = "00000000-0000-0000-0000-000000000001";
const scenarioId = "11111111-1111-4111-8111-111111111111";

describe("GET /api/skin-twin/scenarios/:id", () => {
  it("rejects malformed scenario identifiers", async () => {
    auth.mockResolvedValue({ ok: true, userId });
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ id: "invalid" }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_scenario_id" });
  });

  it("does not disclose a scenario outside the authenticated owner", async () => {
    auth.mockResolvedValue({ ok: true, userId });
    getScenario.mockResolvedValue(null);
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ id: scenarioId }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "skin_twin_scenario_not_found" });
    expect(getScenario).toHaveBeenCalledWith(userId, scenarioId);
  });

  it("returns an unavailable state when the database read fails", async () => {
    auth.mockResolvedValue({ ok: true, userId });
    getScenario.mockRejectedValue(new Error("connection refused"));
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ id: scenarioId }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: "database_connection_refused" });
  });
});
