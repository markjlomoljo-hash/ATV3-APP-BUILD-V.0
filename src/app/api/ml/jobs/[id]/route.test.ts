import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({
  authenticateSupabaseRequest: vi.fn(),
}));
vi.mock("@/lib/acnetrex/ml-analysis-jobs", () => ({
  getMlAnalysisJob: vi.fn(),
}));
vi.mock("@/db", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));

import { GET } from "./route";
import { getMlAnalysisJob } from "@/lib/acnetrex/ml-analysis-jobs";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const getJob = vi.mocked(getMlAnalysisJob);

function routeRequest() {
  return new Request("https://example.test/api/ml/jobs/11111111-1111-4111-8111-111111111111");
}

describe("GET /api/ml/jobs/:id", () => {
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
  });

  it("returns the durable job state without prediction data", async () => {
    auth.mockResolvedValue({ ok: true, userId: "00000000-0000-0000-0000-000000000001" });
    getJob.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      engine: "sleepderm",
      operation: "readiness",
      runtimeMode: "queued_for_cloud",
      status: "queued",
      inputRecordRefs: [{ table: "sleep_logs", id: "sleep-1" }],
      featureSchemaVersion: "sleepderm.v1",
      featuresMissing: [],
      failureReason: null,
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
    const response = await GET(routeRequest(), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, job: { status: "queued" } });
  });
});
