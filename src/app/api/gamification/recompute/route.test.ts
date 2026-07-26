import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
vi.mock("@/lib/acnetrex/gamification/service", () => ({ recomputeGamificationState: vi.fn() }));

import { DatabaseConfigurationError, getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { recomputeGamificationState } from "@/lib/acnetrex/gamification/service";
import { POST } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const recompute = vi.mocked(recomputeGamificationState);
const userId = "00000000-0000-0000-0000-000000000001";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/gamification/recompute", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("gamification recompute route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires authentication before recomputing", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await POST(request({}, { "idempotency-key": "gamification-recompute-01" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_required" });
    expect(recompute).not.toHaveBeenCalled();
  });

  it("requires an idempotency key before recomputing", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
    expect(recompute).not.toHaveBeenCalled();
  });

  it("rejects non-object payloads before touching the database", async () => {
    const response = await POST(request([], { "idempotency-key": "gamification-recompute-02" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "invalid_gamification_recompute_payload" });
    expect(recompute).not.toHaveBeenCalled();
  });

  it("recomputes for the authenticated owner only and returns the derived state", async () => {
    recompute.mockResolvedValue({ status: "computed", persisted: true, currentStreak: 3, points: 25 } as never);
    idempotent.mockImplementation(async (options) => ({ ...(await options.execute({} as never)), replayed: false }));
    const response = await POST(request({}, { "idempotency-key": "gamification-recompute-03" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      gamification: { status: "computed", currentStreak: 3, points: 25 },
      replayed: false,
    });
    expect(recompute).toHaveBeenCalledWith(userId);
    expect(idempotent).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: userId, scope: "gamification-recompute", key: "gamification-recompute-03" }),
    );
  });

  it("returns idempotency conflicts without claiming a recompute", async () => {
    idempotent.mockRejectedValue(new Error("idempotency_key_reused_with_different_payload"));
    const response = await POST(request({}, { "idempotency-key": "gamification-recompute-04" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_reused_with_different_payload" });
    expect(recompute).not.toHaveBeenCalled();
  });

  it("reports database_unavailable when the database is not configured", async () => {
    database.mockImplementation(() => {
      throw new DatabaseConfigurationError();
    });
    const response = await POST(request({}, { "idempotency-key": "gamification-recompute-05" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_unavailable" });
  });
});
