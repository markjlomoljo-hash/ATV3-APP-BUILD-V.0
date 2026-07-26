import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), DatabaseConfigurationError: class DatabaseConfigurationError extends Error {} }));
vi.mock("@/lib/acnetrex/gamification/service", () => ({ getGamificationState: vi.fn() }));

import { DatabaseConfigurationError } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { getGamificationState } from "@/lib/acnetrex/gamification/service";
import { GET } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const state = vi.mocked(getGamificationState);
const userId = "00000000-0000-0000-0000-000000000001";

function request() {
  return new Request("https://example.test/api/gamification");
}

describe("gamification state route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
  });

  it("requires authentication before reading any state", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_required" });
    expect(state).not.toHaveBeenCalled();
  });

  it("serves the owner's computed state", async () => {
    state.mockResolvedValue({
      status: "ok",
      currentStreak: 3,
      longestStreak: 5,
      points: 120,
      rank: "bronze",
      petStage: "sprout",
      petXp: 60,
      lastActionAt: "2026-07-26T09:00:00.000Z",
      badges: [{ code: "first_task_complete", earnedAt: "2026-07-25T00:00:00.000Z" }],
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      gamification: expect.objectContaining({ status: "ok", currentStreak: 3, points: 120 }),
    });
    expect(state).toHaveBeenCalledWith(userId);
  });

  it("serves honest insufficient_data untouched for empty accounts", async () => {
    state.mockResolvedValue({
      status: "insufficient_data",
      currentStreak: 0,
      longestStreak: 0,
      points: 0,
      rank: null,
      petStage: "seed",
      petXp: 0,
      lastActionAt: null,
      badges: [],
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      gamification: { status: "insufficient_data", currentStreak: 0, points: 0, rank: null },
    });
  });

  it("reports database_unavailable when the database is not configured", async () => {
    state.mockRejectedValue(new DatabaseConfigurationError());
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_unavailable" });
  });

  it("maps runtime database failures to a typed 503", async () => {
    state.mockRejectedValue(new Error("connection refused"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_connection_refused" });
  });
});
