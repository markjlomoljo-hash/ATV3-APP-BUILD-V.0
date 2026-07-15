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
  inputRecordRefs: [{ table: "sleep_logs", id: "11111111-1111-4111-8111-111111111115" }],
  features: { records: [{ date: "forged", bedtime: "00:00", wake_time: "00:01" }] },
  featureSchemaVersion: "sleepderm.v1",
  appVersion: "web.test",
  personalProcessing: true,
  rawImageProcessing: false,
  anonymousLearning: false,
  requestId: "11111111-1111-4111-8111-111111111115",
  idempotencyKey: "11111111-1111-4111-8111-111111111116",
  consentSnapshot: {},
  attemptCount: 1,
  maxAttempts: 5,
};

function claimQueries() {
  fakeClient.query.mockImplementation(async (sql: string) => {
    if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
    if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
    if (sql.includes("from public.sleep_logs")) return {
      rows: [{
        id: "11111111-1111-4111-8111-111111111115",
        logDate: "2026-07-13",
        sleepTime: "2026-07-13T23:00:00+08:00",
        wakeTime: "2026-07-14T07:00:00+08:00",
      }],
      rowCount: 1,
    };
    return { rows: [], rowCount: 1 };
  });
}

function upstream(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

function canonicalResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    request_id: job.jobId,
    job_id: job.jobId,
    module: "sleepderm",
    task: "sleep_pattern_analysis",
    result_type: "deterministic_analysis",
    result: { state: "ready" },
    runtime_mode: "local_deterministic",
    runtime_provider: "acnetrex_ml",
    readiness_state: "ready",
    model_name: null,
    model_version: null,
    training_data_version: null,
    feature_schema_version: "1.0.0",
    input_record_refs: ["sleep_logs:11111111-1111-4111-8111-111111111115"],
    features_used: ["records"],
    features_missing: [],
    sample_count: 7,
    coverage: 1,
    confidence: null,
    confidence_label: "not_applicable",
    calibration_state: "not_applicable",
    uncertainty: ["No calibrated predictive probability is produced."],
    limitations: ["not diagnostic"],
    confounders: [],
    evidence_state: "not_applicable",
    safety_state: "ready",
    sync_status: "local_only",
    latency_ms: 3,
    created_at: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
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
    expect(fakeClient.query.mock.calls.filter(([sql]) => sql === "begin")).toHaveLength(2);
    expect(fakeClient.query.mock.calls.filter(([sql]) => sql === "commit")).toHaveLength(2);
  });

  it("persists a real upstream payload before closing the outbox event", async () => {
    claimQueries();
    let commitSeenBeforeFetch = false;
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
      commitSeenBeforeFetch = fakeClient.query.mock.calls.some(([sql]) => String(sql) === "commit");
      return upstream(canonicalResponse());
    });
    const result = await processNextMlAnalysisJob({ workerId: "worker-1", fetcher });
    expect(result).toEqual({ status: "completed", jobId: job.jobId, outboxId: job.outboxId });
    expect(fetcher).toHaveBeenCalledWith(
      "https://ml.example.test/predict",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer worker-upstream-secret",
          "idempotency-key": job.jobId,
          "x-request-id": job.jobId,
        }),
      }),
    );
    const request = fetcher.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      contract_version: "1.0.0",
      request_id: job.jobId,
      idempotency_key: job.jobId,
      module: "sleepderm",
      task: "sleep_pattern_analysis",
      feature_schema_version: "1.0.0",
      input_record_refs: ["sleep_logs:11111111-1111-4111-8111-111111111115"],
      inputs: {
        records: [{
          date: "2026-07-13",
          bedtime: "2026-07-13T15:00:00.000Z",
          wake_time: "2026-07-13T23:00:00.000Z",
        }],
      },
      consent: {
        personal_processing: true,
        raw_image_processing: false,
        anonymous_learning: false,
      },
    });
    expect((request?.headers as Record<string, string>)["idempotency-key"]).toBe(job.jobId);
    expect((request?.headers as Record<string, string>)["x-request-id"]).toBe(job.jobId);
    expect(commitSeenBeforeFetch).toBe(true);
    const sourceRead = fakeClient.query.mock.calls.find(([sql]) => String(sql).includes("from public.sleep_logs"));
    expect(String(sourceRead?.[0])).toContain("user_id=$1::uuid");
    expect(sourceRead?.[1]).toEqual([job.userId, ["11111111-1111-4111-8111-111111111115"]]);
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("insert into public.ml_analysis_results"))).toBe(true);
    const resultInsert = queries.find((sql) => sql.includes("insert into public.ml_analysis_results"));
    expect(resultInsert).toContain("result_type");
    expect(resultInsert).toContain("readiness_state");
    expect(resultInsert).toContain("idempotency_key");
    expect(resultInsert).toContain("on conflict (job_id) do update set");
    const inboxInsert = fakeClient.query.mock.calls
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes("insert into public.consumer_inbox"));
    expect(inboxInsert).toContain("$2::uuid");
    expect(inboxInsert).toContain("$3::text");
    expect(queries.some((sql) => sql.includes("insert into public.consumer_inbox"))).toBe(true);
    expect(queries.some((sql) => sql.includes("status='processed'"))).toBe(true);
  });

  it("allows an expired processing lease to be reclaimed after a worker crash", async () => {
    claimQueries();
    await processNextMlAnalysisJob({
      workerId: "recovery-worker",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse())),
    });

    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    const claimSql = queries.find((sql) => sql.includes("with candidate"));
    const processingSql = queries.find((sql) => sql.includes("update public.ml_analysis_jobs") && sql.includes("set status='processing'"));

    expect(claimSql).toContain("j.status = 'processing'");
    expect(claimSql).toContain("o.status = 'leased' and o.lease_expires_at < now()");
    expect(claimSql).toContain("o.attempt_count < o.max_attempts");
    expect(processingSql).toContain("status in ('queued', 'processing')");
  });

  it("uses the constrained outbox lifecycle and fences finalization to the active lease owner", async () => {
    claimQueries();
    await processNextMlAnalysisJob({
      workerId: "fenced-worker",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse())),
    });

    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    const claimSql = queries.find((sql) => sql.includes("with candidate"));
    const outboxUpdates = queries.filter((sql) => sql.includes("update public.outbox_events"));
    expect(claimSql).toContain("set status='leased'");
    expect(claimSql).toContain("c.personal_processing");
    expect(claimSql).toContain("c.raw_image_processing");
    expect(outboxUpdates.some((sql) => sql.includes("lease_owner=$2") && sql.includes("status='leased'"))).toBe(true);
    expect(outboxUpdates.some((sql) => sql.includes("set status='processing'"))).toBe(false);
    expect(outboxUpdates.some((sql) => sql.includes("set status='failed'"))).toBe(false);
  });

  it("persists a contract-valid unavailable response instead of treating it as transport failure", async () => {
    claimQueries();
    const result = await processNextMlAnalysisJob({
      workerId: "worker-unavailable",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse({
        ok: false,
        result_type: "insufficient_data",
        result: null,
        readiness_state: "insufficient_data",
        safety_state: "insufficient_data",
        sample_count: 0,
        coverage: 0,
        features_missing: ["records"],
      }), 422)),
    });

    expect(result.status).toBe("completed");
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("insert into public.ml_analysis_results"))).toBe(true);
    const statusUpdate = fakeClient.query.mock.calls.find(([sql]) =>
      String(sql).includes("update public.ml_analysis_jobs") && String(sql).includes("set status=$2"));
    expect(statusUpdate?.[1]).toEqual([job.jobId, "insufficient_data", "worker-unavailable"]);
  });

  it("does not accept a ready-shaped payload delivered with a retryable HTTP failure", async () => {
    claimQueries();

    const result = await processNextMlAnalysisJob({
      workerId: "worker-http-failure",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse(), 503)),
    });

    expect(result).toMatchObject({
      status: "retry_scheduled",
      reason: "ml_upstream_http_503",
    });
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("insert into public.ml_analysis_results"))).toBe(false);
  });

  it("does not mark a Skin Twin snapshot completed when the domain response has no output", async () => {
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
      workerId: "worker-skin-twin-insufficient",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse({
        ok: false,
        module: "skin_twin",
        task: "scenario_validation",
        result_type: "insufficient_data",
        result: null,
        readiness_state: "insufficient_data",
        safety_state: "insufficient_data",
        sample_count: 0,
        coverage: 0,
      }), 422)),
    });

    expect(result.status).toBe("completed");
    const snapshotUpdate = fakeClient.query.mock.calls.find(([sql]) => String(sql).includes("update public.skin_twin_snapshots"));
    expect(String(snapshotUpdate?.[0])).not.toContain("set status='completed'");
    expect(snapshotUpdate?.[1]).toContain("insufficient_data");
  });

  it("classifies durable result write failures separately from upstream transport failures", async () => {
    let resultInsertFailed = false;
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
      if (sql.includes("from public.sleep_logs")) return { rows: [], rowCount: 0 };
      if (sql.includes("insert into public.ml_analysis_results") && !resultInsertFailed) {
        resultInsertFailed = true;
        throw new Error("database disk write failed");
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await processNextMlAnalysisJob({
      workerId: "worker-result-write-failure",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse())),
    });

    expect(result).toMatchObject({ status: "retry_scheduled", reason: "ml_result_persistence_failed" });
  });

  it("ignores invalid owner source timestamps instead of misclassifying them as network failures", async () => {
    let requestBody: Record<string, unknown> | undefined;
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
      if (sql.includes("from public.sleep_logs")) return {
        rows: [{
          id: "11111111-1111-4111-8111-111111111115",
          logDate: "2026-07-13",
          sleepTime: "not-a-timestamp",
          wakeTime: "2026-07-14T07:00:00+08:00",
        }],
        rowCount: 1,
      };
      return { rows: [], rowCount: 1 };
    });
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return upstream(canonicalResponse({
        ok: false,
        result_type: "insufficient_data",
        result: null,
        readiness_state: "insufficient_data",
        safety_state: "insufficient_data",
        sample_count: 0,
        coverage: 0,
      }), 422);
    });

    const result = await processNextMlAnalysisJob({ workerId: "worker-invalid-time", fetcher });

    expect(result.status).toBe("completed");
    expect(requestBody).toMatchObject({ inputs: { records: [] } });
  });

  it("forwards only owner-verified source references and never trusts client features for non-SleepDerm engines", async () => {
    const ownedId = "11111111-1111-4111-8111-111111111121";
    const foreignId = "11111111-1111-4111-8111-111111111122";
    const dietJob = {
      ...job,
      engine: "dermdiet" as const,
      operation: "daily_completeness",
      inputRecordRefs: [
        { table: "food_logs", id: ownedId },
        { table: "food_logs", id: foreignId },
        { table: "untrusted_table", id: ownedId },
      ],
      features: { expected_meals: 3, meals: [{ event_id: "forged" }], secret_url: "https://attacker.invalid/raw" },
    };
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [dietJob], rowCount: 1 };
      if (sql.includes("from public.food_logs")) return { rows: [{ id: ownedId }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const fetcher = vi.fn().mockResolvedValue(upstream(canonicalResponse({
      module: "dermdiet",
      task: "daily_completeness",
      result: { state: "partial" },
      readiness_state: "partial",
      safety_state: "partial",
    })));

    const result = await processNextMlAnalysisJob({ workerId: "worker-owner-refs", fetcher });

    expect(result.status).toBe("completed");
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request.input_record_refs).toEqual([`food_logs:${ownedId}`]);
    expect(request.inputs).toEqual({});
    expect(JSON.stringify(request)).not.toContain("attacker.invalid");
    expect(JSON.stringify(request)).not.toContain("forged");
    const sourceRead = fakeClient.query.mock.calls.find(([sql]) => String(sql).includes("from public.food_logs"));
    expect(String(sourceRead?.[0])).toContain("user_id=$1::uuid");
    expect(sourceRead?.[1]).toEqual([job.userId, [ownedId, foreignId]]);
    expect(JSON.stringify(fakeClient.query.mock.calls)).not.toContain("untrusted_table");
  });

  it("builds forecast features from owner-scoped longitudinal rows and ignores client features", async () => {
    const forecastJob = {
      ...job,
      engine: "forecast" as const,
      operation: "flare_direction",
      inputRecordRefs: [],
      features: { sleep_hours: 99, stress_score: -1, injected: true },
    };
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [forecastJob], rowCount: 1 };
      if (sql.includes("from public.sleep_logs")) return {
        rows: [
          { id: "11111111-1111-4111-8111-111111111131", sleepTime: "2026-07-12T23:00:00Z", wakeTime: "2026-07-13T07:00:00Z" },
          { id: "11111111-1111-4111-8111-111111111132", sleepTime: "2026-07-13T22:30:00Z", wakeTime: "2026-07-14T06:30:00Z" },
        ],
        rowCount: 2,
      };
      if (sql.includes("from public.daily_logs")) return {
        rows: [
          { id: "11111111-1111-4111-8111-111111111133", stressLevel: 6 },
          { id: "11111111-1111-4111-8111-111111111134", stressLevel: 8 },
        ],
        rowCount: 2,
      };
      return { rows: [], rowCount: 1 };
    });
    const fetcher = vi.fn().mockResolvedValue(upstream(canonicalResponse({
      module: "forecast",
      task: "flare_direction",
      result_type: "calibrated_predictive_ensemble",
      result: { state: "ready", estimated_direction: "higher", direction_probability: 0.7 },
      runtime_mode: "cloud_run",
      model_name: "flare_direction_ensemble_v1",
      model_version: "1.0.0",
      training_data_version: "cohort:1",
      input_record_refs: [
        "sleep_logs:11111111-1111-4111-8111-111111111131",
        "sleep_logs:11111111-1111-4111-8111-111111111132",
        "daily_logs:11111111-1111-4111-8111-111111111133",
        "daily_logs:11111111-1111-4111-8111-111111111134",
      ],
      confidence: 0.7,
      confidence_label: "moderate",
      calibration_state: "calibrated",
      evidence_state: "available",
      sync_status: "synced",
    })));

    const result = await processNextMlAnalysisJob({ workerId: "worker-forecast", fetcher });

    expect(result.status).toBe("completed");
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      module: "forecast",
      task: "flare_direction",
      inputs: { sleep_hours: 8, stress_score: 7 },
    });
    expect(request.input_record_refs).toEqual([
      "sleep_logs:11111111-1111-4111-8111-111111111131",
      "sleep_logs:11111111-1111-4111-8111-111111111132",
      "daily_logs:11111111-1111-4111-8111-111111111133",
      "daily_logs:11111111-1111-4111-8111-111111111134",
    ]);
    expect(JSON.stringify(request)).not.toContain("injected");
    const sourceReads = fakeClient.query.mock.calls.filter(([sql]) =>
      String(sql).includes("from public.sleep_logs") || String(sql).includes("from public.daily_logs"));
    expect(sourceReads.every(([, parameters]) => parameters?.[0] === job.userId)).toBe(true);
    const dailyRead = sourceReads.find(([sql]) => String(sql).includes("from public.daily_logs"));
    expect(String(dailyRead?.[0])).toContain("user_id=$1 and");
  });

  it("rejects a validly shaped response with mismatched request lineage", async () => {
    claimQueries();
    const result = await processNextMlAnalysisJob({
      workerId: "worker-lineage",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse({
        request_id: "22222222-2222-4222-8222-222222222222",
      }))),
    });

    expect(result).toMatchObject({ status: "failed", reason: "ml_api_lineage_mismatch" });
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("insert into public.ml_analysis_results"))).toBe(false);
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
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse({
        module: "skin_twin",
        task: "scenario_validation",
        result: { state: "ready", scenario_result: null },
        model_version: "skin-twin.cloud.v1",
        confidence: 0.61,
        confidence_label: "moderate",
        calibration_state: "uncalibrated",
        uncertainty: ["Scenario output is not a guaranteed outcome."],
      }))),
    });
    expect(result.status).toBe("completed");
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("update public.skin_twin_snapshots"))).toBe(true);
    const snapshotUpdate = fakeClient.query.mock.calls.find(([sql]) => String(sql).includes("update public.skin_twin_snapshots"));
    expect(snapshotUpdate?.[1]).toContain("completed");
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
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse({ module: "skin_twin", task: "scenario_validation" }))),
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
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='failed_retryable'"))).toBe(true);
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='processed'"))).toBe(false);
  });

  it("builds Skin Twin validation inputs from the owner snapshot instead of client job features", async () => {
    const snapshotId = "11111111-1111-4111-8111-111111111114";
    const skinTwinJob = {
      ...job,
      engine: "skin_twin" as const,
      operation: "scenario_simulation",
      features: { snapshotId, baseline: { forged: true }, changes: { forged_change: true }, horizon_days: 30 },
    };
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [skinTwinJob], rowCount: 1 };
      if (sql.includes("from public.skin_twin_snapshots snapshot")) return {
        rows: [{
          id: snapshotId,
          scenarioPayload: { name: "Better sleep", variables: ["better_sleep", "lower_stress"], window: "7d" },
          faceScans: 2,
          sleepLogs: 8,
          foodLogs: 8,
        }],
        rowCount: 1,
      };
      return { rows: [], rowCount: 1 };
    });
    const fetcher = vi.fn().mockResolvedValue(upstream(canonicalResponse({
      module: "skin_twin",
      task: "scenario_validation",
      result: { state: "ready", scenario_result: null },
    })));

    const result = await processNextMlAnalysisJob({ workerId: "worker-skin-twin-derived", fetcher });

    expect(result.status).toBe("completed");
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request.input_record_refs).toEqual([`skin_twin_snapshots:${snapshotId}`]);
    expect(request.inputs).toEqual({
      baseline: { face_scans: 2, sleep_logs: 8, food_logs: 8 },
      changes: { better_sleep: true, lower_stress: true },
      horizon_days: 7,
    });
    expect(JSON.stringify(request.inputs)).not.toContain("forged");
    const sourceRead = fakeClient.query.mock.calls.find(([sql]) => String(sql).includes("from public.skin_twin_snapshots snapshot"));
    expect(String(sourceRead?.[0])).toContain("snapshot.user_id=$1::uuid");
    expect(sourceRead?.[1]).toEqual([job.userId, snapshotId]);
  });

  it("aborts an in-flight upstream request during graceful worker shutdown", async () => {
    claimQueries();
    const shutdown = new AbortController();
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      shutdown.abort();
      await Promise.resolve();
      expect(init?.signal?.aborted).toBe(true);
      throw init?.signal?.reason;
    });

    const result = await processNextMlAnalysisJob({
      workerId: "worker-graceful-shutdown",
      fetcher,
      signal: shutdown.signal,
    });

    expect(result).toMatchObject({ status: "retry_scheduled", reason: "ml_worker_shutdown" });
  });

  it("reports a lost lease when retry finalization cannot fence the job row", async () => {
    claimQueries();
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
      if (sql.includes("set status='queued'") && sql.includes("lease_owner=$3")) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await processNextMlAnalysisJob({
      workerId: "worker-lost-retry-lease",
      fetcher: vi.fn().mockResolvedValue(upstream({ error: "vertex_endpoint_unavailable" }, 503)),
    });

    expect(result).toEqual({ status: "lease_lost", jobId: job.jobId, outboxId: job.outboxId });
  });

  it("releases a leased job for retry when Railway requests shutdown", async () => {
    claimQueries();
    const controller = new AbortController();
    let notifyStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { notifyStarted = resolve; });
    const fetcher = vi.fn((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      notifyStarted?.();
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));

    const processing = processNextMlAnalysisJob({ workerId: "worker-shutdown", fetcher, signal: controller.signal });
    await started;
    controller.abort();
    const result = await processing;

    expect(result).toMatchObject({ status: "retry_scheduled", reason: "ml_worker_shutdown" });
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='failed_retryable'"))).toBe(true);
  });

  it("uses Railway persistence mode as dispatch-only and closes the outbox after committed-state verification", async () => {
    vi.stubEnv("ACNETREX_ML_PERSISTENCE_OWNER", "railway");
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
      if (sql.includes("from public.sleep_logs")) return {
        rows: [{
          id: "11111111-1111-4111-8111-111111111115",
          logDate: "2026-07-13",
          sleepTime: "2026-07-13T23:00:00+08:00",
          wakeTime: "2026-07-14T07:00:00+08:00",
        }],
        rowCount: 1,
      };
      if (sql.includes("left join public.ml_analysis_results")) return {
        rows: [{
          status: "completed",
          resultId: "11111111-1111-4111-8111-111111111119",
          requestId: job.jobId,
          engine: job.engine,
          operation: job.operation,
        }],
        rowCount: 1,
      };
      return { rows: [], rowCount: 1 };
    });

    const result = await processNextMlAnalysisJob({
      workerId: "railway-dispatcher",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse())),
    });

    expect(result).toEqual({ status: "completed", jobId: job.jobId, outboxId: job.outboxId });
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("insert into public.ml_analysis_results"))).toBe(false);
    expect(queries.some((sql) => sql.includes("update public.skin_twin_snapshots"))).toBe(false);
    expect(queries.some((sql) => sql.includes("update public.ml_analysis_jobs"))).toBe(false);
    expect(queries.some((sql) => sql.includes("left join public.ml_analysis_results"))).toBe(true);
    expect(queries.some((sql) => sql.includes("insert into public.consumer_inbox"))).toBe(true);
    expect(queries.some((sql) => sql.includes("status='processed'"))).toBe(true);
  });

  it("keeps the dispatch outbox retryable when Railway returns before committed state can be verified", async () => {
    vi.stubEnv("ACNETREX_ML_PERSISTENCE_OWNER", "railway");
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
      if (sql.includes("from public.sleep_logs")) return { rows: [], rowCount: 0 };
      if (sql.includes("left join public.ml_analysis_results")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });

    const result = await processNextMlAnalysisJob({
      workerId: "railway-dispatcher",
      fetcher: vi.fn().mockResolvedValue(upstream(canonicalResponse())),
    });

    expect(result).toMatchObject({ status: "retry_scheduled", reason: "ml_commit_verification_failed" });
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries.some((sql) => sql.includes("insert into public.ml_analysis_results"))).toBe(false);
    expect(queries.some((sql) => sql.includes("status='processed'"))).toBe(false);
    expect(queries.some((sql) => sql.includes("status='failed_retryable'"))).toBe(true);
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
    expect(fakeClient.query.mock.calls.some(([sql]) => String(sql).includes("status='dead_letter'"))).toBe(true);
  });
});
