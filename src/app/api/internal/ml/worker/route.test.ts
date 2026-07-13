import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acnetrex/ml-analysis-worker", () => ({
  processMlAnalysisBatch: vi.fn(),
}));

import { GET, POST } from "./route";
import { processMlAnalysisBatch } from "@/lib/acnetrex/ml-analysis-worker";

const processBatch = vi.mocked(processMlAnalysisBatch);

function request(body: unknown = { maxJobs: 1 }, secret?: string) {
  return new Request("https://example.test/api/internal/ml/worker", {
    method: "POST",
    headers: { "content-type": "application/json", ...(secret ? { "x-worker-secret": secret } : {}) },
    body: JSON.stringify(body),
  });
}

describe("POST /api/internal/ml/worker", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns not configured without a server worker secret", async () => {
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "worker_not_configured" });
  });

  it("requires the internal worker secret", async () => {
    vi.stubEnv("ACNETREX_ML_WORKER_ENABLED", "true");
    vi.stubEnv("ACNETREX_ML_WORKER_SECRET", "worker-secret");
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "worker_auth_required" });
  });

  it("validates the batch request", async () => {
    vi.stubEnv("ACNETREX_ML_WORKER_ENABLED", "true");
    vi.stubEnv("ACNETREX_ML_WORKER_SECRET", "worker-secret");
    const response = await POST(request({ maxJobs: 11 }, "worker-secret"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_worker_payload" });
  });

  it("runs a bounded batch through the server-only worker", async () => {
    vi.stubEnv("ACNETREX_ML_WORKER_ENABLED", "true");
    vi.stubEnv("ACNETREX_ML_WORKER_SECRET", "worker-secret");
    processBatch.mockResolvedValue([{ status: "idle" }]);
    const response = await POST(request({ maxJobs: 2 }, "worker-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, outcomes: [{ status: "idle" }] });
    expect(processBatch).toHaveBeenCalledWith({ maxJobs: 2, workerId: undefined });
  });
});

describe("GET /api/internal/ml/worker", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("supports a Vercel Cron-style bearer secret", async () => {
    vi.stubEnv("ACNETREX_ML_WORKER_ENABLED", "true");
    vi.stubEnv("ACNETREX_ML_WORKER_SECRET", "worker-secret");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    processBatch.mockResolvedValue([{ status: "idle" }]);
    const response = await GET(
      new Request("https://example.test/api/internal/ml/worker", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, outcomes: [{ status: "idle" }] });
    expect(processBatch).toHaveBeenCalledWith({ maxJobs: 1, workerId: undefined });
  });
});
