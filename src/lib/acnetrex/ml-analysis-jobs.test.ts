import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { fakeClient, getPoolMock } = vi.hoisted(() => {
  const fakeClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const fakePool = {
    connect: vi.fn(async () => fakeClient),
    query: vi.fn(),
  };
  return { fakeClient, fakePool, getPoolMock: vi.fn(() => fakePool) };
});
vi.mock("@/db", () => ({ getPool: getPoolMock }));
import { hasPredictionPayload, mlAnalysisRequestSchema, mlJobStatusSchema, mlTask } from "./ml-analysis-jobs";
import { enqueueMlAnalysisJob, getMlAnalysisJob } from "./ml-analysis-jobs";
import { requestHash } from "@/lib/reliability/idempotency";

describe("durable ML analysis job contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts only the canonical inference response contract", () => {
    expect(hasPredictionPayload({ ok: true, predictions: [{ direction: "observed" }] })).toBe(false);
    expect(hasPredictionPayload({
      ok: false,
      request_id: "11111111-1111-4111-8111-111111111111",
      job_id: null,
      module: "faceatlas",
      task: "lesion_analysis",
      result_type: "model_unavailable",
      result: null,
      runtime_mode: "unavailable",
      runtime_provider: "none",
      readiness_state: "model_unavailable",
      model_name: null,
      model_version: null,
      training_data_version: null,
      feature_schema_version: "1.0.0",
      input_record_refs: [],
      features_used: [],
      features_missing: [],
      sample_count: 0,
      coverage: 0,
      confidence: null,
      confidence_label: "not_applicable",
      calibration_state: "not_applicable",
      uncertainty: [],
      limitations: ["No approved model is available."],
      confounders: [],
      evidence_state: "not_applicable",
      safety_state: "model_unavailable",
      sync_status: "not_applicable",
      latency_ms: 1,
      created_at: "2026-07-14T00:00:00.000Z",
    })).toBe(true);
  });

  it("accepts a bounded analysis request and preserves source references", () => {
    const result = mlAnalysisRequestSchema.safeParse({
      engine: "sleepderm",
      operation: "readiness",
      inputRecordRefs: [{ table: "sleep_logs", id: "sleep-1" }],
      features: { sleepDebtMinutes: 120 },
      metadata: { featureSchemaVersion: "sleepderm.v1" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputRecordRefs).toEqual([{ table: "sleep_logs", id: "sleep-1" }]);
    }
  });

  it("rejects an unbounded or unsupported request", () => {
    expect(
      mlAnalysisRequestSchema.safeParse({
        engine: "unknown",
        operation: "x",
        inputRecordRefs: Array.from({ length: 101 }, (_, index) => ({
          table: "sleep_logs",
          id: String(index),
        })),
      }).success,
    ).toBe(false);
    expect(mlAnalysisRequestSchema.safeParse({
      engine: "sleepderm",
      operation: "arbitrary_client_operation",
      inputRecordRefs: [],
      features: {},
      metadata: {},
    }).success).toBe(false);
  });

  it("exposes only durable job states", () => {
    expect(mlJobStatusSchema.options).toEqual([
      "queued",
      "processing",
      "completed",
      "failed",
      "insufficient_data",
      "not_configured",
    ]);
  });

  it("writes the job, outbox event, and idempotency completion in one transaction", async () => {
    const request = {
      engine: "sleepderm" as const,
      operation: "readiness",
      inputRecordRefs: [{ table: "sleep_logs", id: "sleep-1" }],
      features: { sleepDebtMinutes: 120 },
      metadata: { featureSchemaVersion: "sleepderm.v1", appVersion: "web.test" },
    };
    const jobId = "22222222-2222-4222-8222-222222222222";
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit") return { rows: [], rowCount: 0 };
      if (sql.includes("insert into public.api_idempotency_keys")) return { rows: [], rowCount: 1 };
      if (sql.includes("select request_hash as")) {
        return {
          rows: [{ requestHash: requestHash(request), status: "processing", responseStatus: null, responseReference: {} }],
          rowCount: 1,
        };
      }
      if (sql.includes("insert into public.ml_analysis_jobs")) {
        return { rows: [{ id: jobId, engine: request.engine, operation: request.operation }], rowCount: 1 };
      }
      if (sql.includes("insert into public.outbox_events") || sql.includes("update public.api_idempotency_keys")) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`unexpected query: ${sql}`);
    });

    const result = await enqueueMlAnalysisJob({
      actorId: "11111111-1111-4111-8111-111111111112",
      idempotencyKey: "ml-job-key-000001",
      request,
      requestId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result).toMatchObject({ ok: true, status: "queued_for_cloud", jobId, replayed: false });
    const queries = fakeClient.query.mock.calls.map(([sql]) => String(sql));
    expect(queries[0]).toBe("begin");
    expect(queries.some((sql) => sql.includes("insert into public.ml_analysis_jobs"))).toBe(true);
    const jobInsert = queries.find((sql) => sql.includes("insert into public.ml_analysis_jobs"));
    expect(jobInsert).toContain("(id, user_id");
    expect(jobInsert).toContain("request_id");
    expect(jobInsert).toContain("idempotency_key");
    expect(jobInsert).toContain("payload_hash");
    expect(jobInsert).toContain("consent_snapshot");
    expect(jobInsert).toContain("personal_processing");
    expect(jobInsert).toContain("raw_image_processing");
    expect(jobInsert).toContain("personal_learning");
    expect(jobInsert).toContain("$9::uuid,$9::text");
    const jobInsertCall = fakeClient.query.mock.calls.find(([sql]) => String(sql).includes("insert into public.ml_analysis_jobs"));
    expect(jobInsertCall?.[1]?.[0]).toBe(jobId);
    expect(jobInsertCall?.[1]?.filter((value: unknown) => value === jobId)).toHaveLength(1);
    expect(jobInsertCall?.[1]).not.toContain("ml-job-key-000001");
    const outboxInsert = queries.find((sql) => sql.includes("insert into public.outbox_events"));
    expect(outboxInsert).toContain("on conflict (user_id, event_type, deduplication_key)");
    expect(outboxInsert).toContain("where user_id is not null");
    expect(queries.some((sql) => sql.includes("update public.api_idempotency_keys"))).toBe(true);
    expect(queries.at(-1)).toBe("commit");
    expect(fakeClient.release).toHaveBeenCalledOnce();
  });

  it("accepts the governed forecast direction operation and preserves its task", () => {
    const request = mlAnalysisRequestSchema.parse({
      engine: "forecast",
      operation: "flare_direction",
      inputRecordRefs: [],
      features: { forged: "ignored-by-worker" },
    });

    expect(mlTask(request)).toBe("flare_direction");
  });

  it("rolls back instead of acknowledging a job when its outbox event was not inserted", async () => {
    const request = {
      engine: "sleepderm" as const,
      operation: "readiness",
      inputRecordRefs: [],
      features: {},
      metadata: {},
    };
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("insert into public.api_idempotency_keys")) return { rows: [{ id: "reservation" }], rowCount: 1 };
      if (sql.includes("select request_hash as")) {
        return {
          rows: [{ requestHash: requestHash(request), status: "processing", responseStatus: null, responseReference: {} }],
          rowCount: 1,
        };
      }
      if (sql.includes("insert into public.ml_analysis_jobs")) {
        return {
          rows: [{ id: "11111111-1111-4111-8111-111111111111", engine: request.engine, operation: request.operation }],
          rowCount: 1,
        };
      }
      if (sql.includes("insert into public.outbox_events")) return { rows: [], rowCount: 0 };
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(enqueueMlAnalysisJob({
      actorId: "11111111-1111-4111-8111-111111111112",
      idempotencyKey: "ml-job-key-000002",
      request,
      requestId: "22222222-2222-4222-8222-222222222222",
    })).rejects.toThrow("ml_outbox_insert_missing");

    expect(fakeClient.query.mock.calls.map(([sql]) => String(sql))).toContain("rollback");
  });

  it("validates requests and persisted replay references at the service boundary", async () => {
    await expect(enqueueMlAnalysisJob({
      actorId: "11111111-1111-4111-8111-111111111112",
      idempotencyKey: "ml-job-key-000003",
      request: { engine: "sleepderm", operation: "client_bypass" } as never,
      requestId: "22222222-2222-4222-8222-222222222222",
    })).rejects.toThrow();
    expect(getPoolMock().connect).not.toHaveBeenCalled();

    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit") return { rows: [], rowCount: 0 };
      if (sql.includes("insert into public.api_idempotency_keys")) return { rows: [], rowCount: 0 };
      if (sql.includes("select request_hash as")) {
        return {
          rows: [{
            requestHash: requestHash({
              engine: "sleepderm",
              operation: "readiness",
              inputRecordRefs: [],
              features: {},
              metadata: {},
            }),
            status: "completed",
            responseStatus: 202,
            responseReference: { ok: true, jobId: "not-a-uuid" },
          }],
          rowCount: 1,
        };
      }
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(enqueueMlAnalysisJob({
      actorId: "11111111-1111-4111-8111-111111111112",
      idempotencyKey: "ml-job-key-000004",
      request: {
        engine: "sleepderm",
        operation: "readiness",
        inputRecordRefs: [],
        features: {},
        metadata: {},
      },
      requestId: "22222222-2222-4222-8222-222222222222",
    })).rejects.toThrow();
  });

  it("scopes status reads to the authenticated owner", async () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      engine: "sleepderm",
      operation: "readiness",
      runtime_mode: "queued_for_cloud",
      status: "queued",
      input_record_refs: [],
      feature_schema_version: "sleepderm.v1",
      features_missing: [],
      failure_reason: null,
      result_id: "22222222-2222-4222-8222-222222222222",
      result_type: "deterministic_analysis",
      result_payload: { regularity_index: 0.8 },
      result_runtime_mode: "local_deterministic",
      readiness_state: "ready",
      safety_state: "ready",
      coverage: "1",
      calibration_state: "not_applicable",
      confidence: null,
      confidence_label: "not_applicable",
      uncertainty: ["No calibrated predictive probability is produced."],
      limitations: ["not diagnostic"],
      confounders: [],
      evidence_state: "not_applicable",
      result_feature_schema_version: "1.0.0",
      result_input_record_refs: ["sleep_logs:sleep-1"],
      features_used: ["records"],
      result_features_missing: [],
      model_name: null,
      model_version: null,
      training_data_version: null,
      sync_status: "synced",
      latency_ms: "3",
      result_request_id: "11111111-1111-4111-8111-111111111111",
      contract_version: "1.0.0",
      result_created_at: new Date("2026-07-13T00:00:03.000Z"),
      created_at: new Date("2026-07-13T00:00:00.000Z"),
      updated_at: new Date("2026-07-13T00:00:00.000Z"),
    };
    const pool = getPoolMock();
    pool.query.mockResolvedValue({ rows: [row], rowCount: 1 });

    const result = await getMlAnalysisJob({
      actorId: "11111111-1111-4111-8111-111111111112",
      jobId: row.id,
    });

    expect(result).toMatchObject({
      id: row.id,
      status: "queued",
      analysis: {
        id: row.result_id,
        resultType: "deterministic_analysis",
        readinessState: "ready",
        output: { regularity_index: 0.8 },
      },
    });
    const [sql, params] = pool.query.mock.calls.at(-1)!;
    expect(String(sql)).toContain("where j.id=$1::uuid and j.user_id=$2::uuid");
    expect(params).toEqual([row.id, "11111111-1111-4111-8111-111111111112"]);
  });
});
