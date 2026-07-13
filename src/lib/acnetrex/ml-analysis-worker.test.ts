import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { fakeClient, getPoolMock } = vi.hoisted(() => {
  const fakeClient = { query: vi.fn(), release: vi.fn() };
  const fakePool = { connect: vi.fn(async () => fakeClient) };
  return { fakeClient, getPoolMock: vi.fn(() => fakePool) };
});
vi.mock("@/db", () => ({ getPool: getPoolMock }));

import { processNextMlAnalysisJob } from "./ml-analysis-worker";

const job = {
  outboxId: "11111111-1111-4111-8111-111111111111",
  jobId: "11111111-1111-4111-8111-111111111112",
  userId: "11111111-1111-4111-8111-111111111113",
  engine: "sleepderm" as const,
  operation: "readiness",
  inputRecordRefs: [{ table: "sleep_logs", id: "sleep-1" }],
  features: { sleepDebtMinutes: 120 },
  featureSchemaVersion: "sleepderm.v1",
  appVersion: "web.test",
  attemptCount: 1,
  maxAttempts: 5,
};

function claimQueries() {
  fakeClient.query.mockImplementation(async (sql: string) => {
    if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
    if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
}

function upstream(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

describe("ML analysis worker", () => {
  beforeEach(() => {
    vi.stubEnv("ACNETREX_ML_API_URL", "https://ml.example.test/");
    vi.stubEnv("ACNETREX_ML_SHARED_SECRET", "worker-upstream-secret");
    vi.stubEnv("ML_WORKER_TIMEOUT_MS", "15000");
    fakeClient.query.mockReset();
    fakeClient.release.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns idle without claiming when no queued event is available", async () => {
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    const result = await processNextMlAnalysisJob({ workerId: "worker-1", fetcher: vi.fn() });
    expect(result).toEqual({ status: "idle" });
    expect(fakeClient.release).toHaveBeenCalledOnce();
  });

  it("fails a claimed job honestly when the cloud service is not configured", async () => {
    vi.stubEnv("ACNETREX_ML_API_URL", "");
    claimQueries();
    const result = await processNextMlAnalysisJob({ workerId: "worker-1", fetcher: vi.fn() });
    expect(result).toEqual({ status: "not_configured", reason: "ml_cloud_not_configured" });
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='failed'"))).toBe(true);
  });

  it("persists a real upstream payload before closing the outbox event", async () => {
    claimQueries();
    let commitSeenBeforeFetch = false;
    const fetcher = vi.fn(async () => {
      commitSeenBeforeFetch = fakeClient.query.mock.calls.some(([sql]) => String(sql) === "commit");
      return upstream({
        ok: true,
        predictions: [{ direction: "observed" }],
        metadata: { modelVersion: "cloud.v1", confidence: 0.72, limitations: ["not diagnostic"] },
      });
    });
    const result = await processNextMlAnalysisJob({ workerId: "worker-1", fetcher });
    expect(result).toEqual({ status: "completed", jobId: job.jobId, outboxId: job.outboxId });
    expect(fetcher).toHaveBeenCalledWith(
      "https://ml.example.test/predict",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer worker-upstream-secret" }),
      }),
    );
    expect(commitSeenBeforeFetch).toBe(true);
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("insert into public.ml_analysis_results"))).toBe(true);
    expect(queries.some((sql) => sql.includes("status='processed'"))).toBe(true);
  });

  it("finalizes only the owner-scoped Skin Twin snapshot after a real upstream result", async () => {
    const snapshotId = "11111111-1111-4111-8111-111111111114";
    const skinTwinJob = {
      ...job,
      engine: "skin_twin" as const,
      operation: "scenario_simulation",
      features: { snapshotId, variables: ["better_sleep"] },
    };
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [skinTwinJob], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const result = await processNextMlAnalysisJob({
      workerId: "worker-skin-twin",
      fetcher: vi.fn().mockResolvedValue(upstream({
        ok: true,
        predictions: [{ direction: "observed" }],
        metadata: { modelVersion: "skin-twin.cloud.v1", confidence: 0.61, uncertainty: { low: -0.2, high: 0.2 } },
      })),
    });
    expect(result.status).toBe("completed");
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("update public.skin_twin_snapshots"))).toBe(true);
    expect(queries.some((sql) => sql.includes("status='completed'"))).toBe(true);
  });

  it("does not complete a Skin Twin result when snapshot lineage is missing", async () => {
    const skinTwinJob = {
      ...job,
      engine: "skin_twin" as const,
      operation: "scenario_simulation",
      features: { variables: ["better_sleep"] },
    };
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [skinTwinJob], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const result = await processNextMlAnalysisJob({
      workerId: "worker-skin-twin-missing-lineage",
      fetcher: vi.fn().mockResolvedValue(upstream({ ok: true, predictions: [{ direction: "observed" }] })),
    });
    expect(result).toMatchObject({ status: "retry_scheduled", reason: "ml_result_persistence_failed" });
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("status='processed'"))).toBe(false);
  });

  it("requeues transient upstream failures with bounded retry state", async () => {
    claimQueries();
    const result = await processNextMlAnalysisJob({
      workerId: "worker-1",
      fetcher: vi.fn().mockResolvedValue(upstream({ error: "vertex_endpoint_unavailable" }, 503)),
    });
    expect(result).toEqual({
      status: "retry_scheduled",
      jobId: job.jobId,
      reason: "vertex_endpoint_unavailable",
      attemptCount: 1,
    });
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='pending'"))).toBe(true);
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='processed'"))).toBe(false);
  });

  it("marks malformed successful responses as terminal after the retry budget", async () => {
    claimQueries();
    const exhausted = { ...job, attemptCount: 5, maxAttempts: 5 };
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [exhausted], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const result = await processNextMlAnalysisJob({
      workerId: "worker-1",
      fetcher: vi.fn().mockResolvedValue(upstream({ ok: true, message: "metadata only" })),
    });
    expect(result).toMatchObject({ status: "failed", jobId: job.jobId, reason: "ml_api_unexpected_response" });
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='failed'"))).toBe(true);
  });
});
