import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({
  authenticateSupabaseRequest: vi.fn(),
}));
vi.mock("@/lib/acnetrex/ml-analysis-jobs", () => ({
  getMlAnalysisJob: vi.fn(),
}));
vi.mock("@/db", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));
vi.mock("@/lib/acnetrex/ml-worker-kick", () => ({
  kickMlWorker: vi.fn(),
}));

import { GET } from "./route";
import { getMlAnalysisJob } from "@/lib/acnetrex/ml-analysis-jobs";
import { kickMlWorker } from "@/lib/acnetrex/ml-worker-kick";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const getJob = vi.mocked(getMlAnalysisJob);
const kick = vi.mocked(kickMlWorker);

function jobRecord(status: "queued" | "processing" | "completed" | "failed") {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    engine: "sleepderm" as const,
    operation: "readiness",
    runtimeMode: "queued_for_cloud" as const,
    status,
    inputRecordRefs: [{ table: "sleep_logs", id: "sleep-1" }],
    featureSchemaVersion: "sleepderm.v1",
    featuresMissing: [],
    failureReason: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
  };
}

function routeRequest() {
  return new Request("https://example.test/api/ml/jobs/11111111-1111-4111-8111-111111111111");
}

describe("GET /api/ml/jobs/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects malformed job identifiers", async () => {
    auth.mockResolvedValue({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_job_id" });
  });

  it("does not reveal jobs outside the authenticated owner", async () => {
    auth.mockResolvedValue({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });
    getJob.mockResolvedValue(null);
    const response = await GET(routeRequest(), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "analysis_job_not_found" });
    expect(getJob).toHaveBeenCalledWith({
      actorId: "00000000-0000-0000-0000-000000000001",
      jobId: "11111111-1111-4111-8111-111111111111",
    });
    expect(kick).not.toHaveBeenCalled();
  });

  it("returns the durable job state without prediction data", async () => {
    auth.mockResolvedValue({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });
    getJob.mockResolvedValue(jobRecord("queued"));
    const response = await GET(routeRequest(), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, job: { status: "queued" } });
  });

  it("kicks the worker when a polled job is still pending", async () => {
    auth.mockResolvedValue({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });
    getJob.mockResolvedValue(jobRecord("queued"));
    const response = await GET(routeRequest(), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(response.status).toBe(200);
    expect(kick).toHaveBeenCalledTimes(1);
    expect(kick).toHaveBeenCalledWith("status_read");
  });

  it("does not kick the worker for terminal jobs", async () => {
    auth.mockResolvedValue({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });
    getJob.mockResolvedValue(jobRecord("completed"));
    const response = await GET(routeRequest(), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, job: { status: "completed" } });
    expect(kick).not.toHaveBeenCalled();
  });
});
