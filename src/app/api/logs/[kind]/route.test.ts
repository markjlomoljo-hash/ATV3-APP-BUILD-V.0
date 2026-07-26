import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({
  getDb: vi.fn(),
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));
vi.mock("@/lib/acnetrex/daily-logs/service", () => ({
  createDailyLogEntry: vi.fn(),
  listDailyLogEntries: vi.fn(),
}));

import { DatabaseConfigurationError, getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { createDailyLogEntry, listDailyLogEntries } from "@/lib/acnetrex/daily-logs/service";
import { GET, POST } from "./route";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const idempotent = vi.mocked(executeIdempotent);
const create = vi.mocked(createDailyLogEntry);
const list = vi.mocked(listDailyLogEntries);
const userId = "00000000-0000-0000-0000-000000000001";

function context(kind: string) {
  return { params: Promise.resolve({ kind }) };
}

function getRequest(kind: string, query = "") {
  return new Request(`https://example.test/api/logs/${kind}${query}`);
}

function postRequest(kind: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://example.test/api/logs/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const stressEntry = {
  id: "row-1",
  kind: "stress",
  logDate: "2026-07-25",
  recordedAt: "2026-07-25T20:00:00.000Z",
  values: { stressLevel: 7 },
  notes: null,
};

describe("canonical daily-log routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires a signed session before reading history", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await GET(getRequest("sleep"), context("sleep"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_required" });
    expect(list).not.toHaveBeenCalled();
  });

  it("returns 404 for kinds outside the canonical nine", async () => {
    const response = await GET(getRequest("weather"), context("weather"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "unknown_log_kind" });
    expect(list).not.toHaveBeenCalled();
  });

  it("returns owner-scoped history with the declared table", async () => {
    list.mockResolvedValue([stressEntry] as never);
    const response = await GET(getRequest("stress", "?limit=14"), context("stress"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      kind: "stress",
      table: "daily_logs",
      entries: [{ id: "row-1", values: { stressLevel: 7 } }],
    });
    expect(list).toHaveBeenCalledWith(userId, "stress", 14);
  });

  it("rejects an invalid limit before querying", async () => {
    const response = await GET(getRequest("stress", "?limit=0"), context("stress"));
    expect(response.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it("reports database failures as typed 503s without fake history", async () => {
    list.mockRejectedValue(new Error("connection refused"));
    const response = await GET(getRequest("sleep"), context("sleep"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_connection_refused" });
  });

  it("requires an idempotency key before accepting a write", async () => {
    const response = await POST(
      postRequest("stress", { logDate: "2026-07-25", stressLevel: 7 }),
      context("stress"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
    expect(create).not.toHaveBeenCalled();
  });

  it("validates the payload against the kind schema", async () => {
    const response = await POST(
      postRequest("stress", { logDate: "2026-07-25", stressLevel: 22 }, { "idempotency-key": "daily-log-stress-001" }),
      context("stress"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "invalid_daily_log_payload" });
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses cycle submissions without the explicit consent acknowledgment", async () => {
    const response = await POST(
      postRequest(
        "cycle",
        { logDate: "2026-07-25", phase: "luteal" },
        { "idempotency-key": "daily-log-cycle-001" },
      ),
      context("cycle"),
    );
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("persists a valid entry through the idempotent transaction", async () => {
    create.mockResolvedValue(stressEntry as never);
    idempotent.mockImplementation(async (options) => ({
      ...(await options.execute({} as never)),
      replayed: false,
    }));

    const response = await POST(
      postRequest(
        "stress",
        { logDate: "2026-07-25", stressLevel: 7, notes: "deadline" },
        { "idempotency-key": "daily-log-stress-002" },
      ),
      context("stress"),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      kind: "stress",
      table: "daily_logs",
      entry: { id: "row-1" },
      replayed: false,
    });
    expect(idempotent).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: userId, scope: "daily-log-stress", route: "/api/logs/stress" }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      "stress",
      expect.objectContaining({ logDate: "2026-07-25", stressLevel: 7, notes: "deadline" }),
    );
  });

  it("passes schema defaults into the persisted payload", async () => {
    create.mockResolvedValue({ ...stressEntry, kind: "routine" } as never);
    idempotent.mockImplementation(async (options) => ({
      ...(await options.execute({} as never)),
      replayed: false,
    }));

    await POST(
      postRequest(
        "routine",
        { logDate: "2026-07-25", stepsCompleted: ["cleanser_am"] },
        { "idempotency-key": "daily-log-routine-001" },
      ),
      context("routine"),
    );

    expect(create).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      "routine",
      expect.objectContaining({ stepsCompleted: ["cleanser_am"], productChangeIntroduced: false }),
    );
  });

  it("returns 503 database_unavailable when persistence is not configured", async () => {
    idempotent.mockRejectedValue(new DatabaseConfigurationError());
    const response = await POST(
      postRequest("stress", { logDate: "2026-07-25", stressLevel: 7 }, { "idempotency-key": "daily-log-stress-003" }),
      context("stress"),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_unavailable" });
  });

  it("surfaces idempotency conflicts without claiming a save", async () => {
    idempotent.mockRejectedValue(new Error("idempotency_key_reused_with_different_payload"));
    const response = await POST(
      postRequest("stress", { logDate: "2026-07-25", stressLevel: 7 }, { "idempotency-key": "daily-log-stress-004" }),
      context("stress"),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_reused_with_different_payload" });
  });
});
