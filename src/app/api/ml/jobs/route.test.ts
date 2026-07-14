import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({
  authenticateSupabaseRequest: vi.fn(),
}));
vi.mock("@/lib/acnetrex/ml-analysis-jobs", () => ({
  mlAnalysisRequestSchema: {
    safeParse: (value: unknown) =>
      typeof value === "object" && value !== null && "engine" in value
        ? { success: true, data: value }
        : { success: false, error: { issues: [{ message: "invalid" }] } },
  },
  enqueueMlAnalysisJob: vi.fn(),
}));
vi.mock("@/db", () => ({
  getDb: vi.fn(),
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));

import { POST } from "./route";
import { DatabaseConfigurationError, getDb } from "@/db";
import { enqueueMlAnalysisJob } from "@/lib/acnetrex/ml-analysis-jobs";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const enqueue = vi.mocked(enqueueMlAnalysisJob);

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/ml/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ml/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires authentication before accepting a job", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await POST(request({ engine: "sleepderm" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_required" });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("requires an idempotency key", async () => {
    const response = await POST(request({ engine: "sleepderm" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("reports database unavailability instead of acknowledging a queued job", async () => {
    database.mockImplementation(() => {
      throw new DatabaseConfigurationError();
    });
    const response = await POST(
      request(
        { engine: "sleepderm", operation: "readiness" },
        { "idempotency-key": "ml-job-key-000001" },
      ),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_unavailable" });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("returns the durable queued reference from the service", async () => {
    enqueue.mockResolvedValue({
      ok: true,
      status: "queued_for_cloud",
      jobId: "00000000-0000-0000-0000-000000000002",
      engine: "sleepderm",
      operation: "readiness",
      runtimeMode: "queued_for_cloud",
      syncStatus: "pending",
      replayed: false,
    });
    const response = await POST(
      request(
        { engine: "sleepderm", operation: "readiness" },
        { "idempotency-key": "ml-job-key-000001" },
      ),
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ ok: true, status: "queued_for_cloud" });
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "00000000-0000-0000-0000-000000000001",
        idempotencyKey: "ml-job-key-000001",
      }),
    );
  });
});
