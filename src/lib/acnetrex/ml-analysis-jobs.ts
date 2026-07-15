import "server-only";

import { z } from "zod";
import { getPool } from "@/db";
import { executeIdempotent, requestHash } from "@/lib/reliability/idempotency";
import { inferenceResponseSchema } from "../../../packages/ml-local-runtime/src/contracts";

const inputRecordRefSchema = z.object({
  table: z.string().min(1).max(80),
  id: z.string().min(1).max(160),
});

const operationsByEngine = {
  faceatlas: ["capture_quality", "lesion_analysis"],
  sleepderm: ["sleep_pattern_analysis", "readiness"],
  dermdiet: ["daily_completeness"],
  triggergraph: ["association_analysis"],
  forecast: ["readiness", "flare_direction"],
  skin_twin: ["scenario_simulation", "scenario_validation"],
  cutisai: ["evidence_assistance"],
} as const;

export const mlAnalysisRequestSchema = z.object({
  engine: z.enum(["faceatlas", "sleepderm", "dermdiet", "triggergraph", "forecast", "skin_twin", "cutisai"]),
  operation: z.string().min(1).max(120),
  inputRecordRefs: z.array(inputRecordRefSchema).max(100).default([]),
  features: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((request, context) => {
  const supported = operationsByEngine[request.engine] as readonly string[];
  if (!supported.includes(request.operation)) {
    context.addIssue({
      code: "custom",
      path: ["operation"],
      message: `Unsupported ${request.engine} operation`,
    });
  }
});

export const mlJobStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
  "insufficient_data",
  "not_configured",
]);

export type MlAnalysisRequest = z.infer<typeof mlAnalysisRequestSchema>;
export type MlJobStatus = z.infer<typeof mlJobStatusSchema>;

const mlAnalysisJobReferenceSchema = z.object({
  ok: z.literal(true),
  status: z.literal("queued_for_cloud"),
  jobId: z.string().uuid(),
  engine: mlAnalysisRequestSchema.shape.engine,
  operation: z.string().min(1).max(120),
  runtimeMode: z.literal("queued_for_cloud"),
  syncStatus: z.literal("pending"),
}).strict();

export type MlAnalysisJobReference = z.infer<typeof mlAnalysisJobReferenceSchema>;

export function mlFeatureSchemaVersion(request: MlAnalysisRequest): string | null {
  const value = request.metadata.featureSchemaVersion;
  return typeof value === "string" && value.length <= 80 ? value : null;
}

export function mlAppVersion(request: MlAnalysisRequest): string | null {
  const value = request.metadata.appVersion;
  return typeof value === "string" && value.length <= 80 ? value : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasPredictionPayload(payload: unknown): payload is Record<string, unknown> {
  return inferenceResponseSchema.safeParse(payload).success;
}

export function mlTask(request: Pick<MlAnalysisRequest, "engine" | "operation">): string {
  if (request.engine === "faceatlas") return request.operation;
  if (request.engine === "sleepderm") return "sleep_pattern_analysis";
  if (request.engine === "dermdiet") return "daily_completeness";
  if (request.engine === "triggergraph") return "association_analysis";
  if (request.engine === "forecast") return request.operation;
  if (request.engine === "skin_twin") return "scenario_validation";
  return "evidence_assistance";
}

export async function enqueueMlAnalysisJob(options: {
  actorId: string;
  idempotencyKey: string;
  request: MlAnalysisRequest;
  requestId: string;
}): Promise<MlAnalysisJobReference & { replayed: boolean }> {
  const actorId = z.string().uuid().parse(options.actorId);
  const idempotencyKey = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/).parse(options.idempotencyKey);
  const request = mlAnalysisRequestSchema.parse(options.request);
  const requestId = z.string().uuid().parse(options.requestId);
  const result = await executeIdempotent({
    actorId,
    scope: "ml-analysis-job",
    key: idempotencyKey,
    method: "POST",
    route: "/api/ml/jobs",
    payload: request,
    execute: async (client) => {
      const inserted = await client.query<{
        id: string;
        engine: MlAnalysisRequest["engine"];
        operation: string;
      }>(
        `insert into public.ml_analysis_jobs
         (user_id, engine, operation, runtime_mode, status, input_record_refs,
          feature_schema_version, features, features_missing, app_version, schema_version,
          request_id, idempotency_key, module, task, payload_hash, consent_snapshot)
         values ($1::uuid,$2,$3,'queued_for_cloud','queued',$4::jsonb,$5,$6::jsonb,
                 '[]'::jsonb,$7,'1',$8::uuid,$9,$2,$10,$11,
                 coalesce((
                   select jsonb_build_object(
                     'personal_processing', c.personal_processing,
                     'raw_image_processing', c.raw_image_processing,
                     'raw_image_retention', c.raw_image_retention,
                     'personal_learning', c.personal_learning,
                     'anonymous_learning', c.anonymous_learning,
                     'consented_at', c.consented_at,
                     'captured_at', now()
                   )
                   from public.consents c where c.user_id=$1::uuid
                 ), jsonb_build_object(
                   'personal_processing', false,
                   'raw_image_processing', false,
                   'raw_image_retention', false,
                   'personal_learning', false,
                   'anonymous_learning', false,
                   'consented_at', null,
                   'captured_at', now()
                 )))
         returning id, engine, operation`,
        [
          actorId,
          request.engine,
          request.operation,
          JSON.stringify(request.inputRecordRefs),
          mlFeatureSchemaVersion(request),
          JSON.stringify(request.features),
          mlAppVersion(request),
          requestId,
          idempotencyKey,
          mlTask(request),
          requestHash(request),
        ],
      );
      const job = inserted.rows[0];
      if (!job) throw new Error("ml_job_insert_missing");

      const outbox = await client.query(
        `insert into public.outbox_events
         (event_type, aggregate_type, aggregate_id, user_id, payload, deduplication_key)
         values ('ml.analysis.requested','ml_analysis_job',$1,$2::uuid,$3::jsonb,$4)
         on conflict (deduplication_key) do nothing
         returning id`,
        [
          job.id,
          actorId,
          JSON.stringify({ jobId: job.id, requestId, engine: job.engine, operation: job.operation }),
          `ml-analysis-job:${actorId}:${idempotencyKey}`,
        ],
      );
      if (outbox.rowCount !== 1) throw new Error("ml_outbox_insert_missing");

      const reference: MlAnalysisJobReference = {
        ok: true,
        status: "queued_for_cloud",
        jobId: job.id,
        engine: job.engine,
        operation: job.operation,
        runtimeMode: "queued_for_cloud",
        syncStatus: "pending",
      };
      return {
        status: 202,
        reference,
        resourceType: "ml_analysis_job",
        resourceId: job.id,
      };
    },
  });

  const reference = mlAnalysisJobReferenceSchema.parse(result.reference);
  return { ...reference, replayed: result.replayed };
}

export async function getMlAnalysisJob(options: { actorId: string; jobId: string }) {
  const result = await getPool().query<{
    id: string;
    engine: MlAnalysisRequest["engine"];
    operation: string;
    runtime_mode: "queued_for_cloud";
    status: MlJobStatus;
    input_record_refs: unknown;
    feature_schema_version: string | null;
    features_missing: unknown;
    failure_reason: string | null;
    result_id: string | null;
    result_type: string | null;
    result_payload: unknown;
    result_runtime_mode: string | null;
    readiness_state: string | null;
    safety_state: string | null;
    coverage: string | number | null;
    calibration_state: string | null;
    confidence: string | number | null;
    confidence_label: string | null;
    uncertainty: unknown;
    limitations: unknown;
    confounders: unknown;
    evidence_state: string | null;
    result_feature_schema_version: string | null;
    result_input_record_refs: unknown;
    features_used: unknown;
    result_features_missing: unknown;
    model_name: string | null;
    model_version: string | null;
    training_data_version: string | null;
    sync_status: string | null;
    latency_ms: string | number | null;
    result_request_id: string | null;
    contract_version: string | null;
    result_created_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `select j.id, j.engine, j.operation, j.runtime_mode, j.status, j.input_record_refs,
            j.feature_schema_version, j.features_missing, j.failure_reason, j.created_at, j.updated_at,
            r.id as result_id, r.result_type, r.result as result_payload,
            r.runtime_mode as result_runtime_mode, r.readiness_state, r.safety_state,
            r.coverage, r.calibration_state, r.confidence, r.confidence_label,
            r.uncertainty, r.limitations, r.confounders, r.evidence_state,
            r.feature_schema_version as result_feature_schema_version,
            r.input_record_refs as result_input_record_refs, r.features_used,
            r.features_missing as result_features_missing, r.model_name, r.model_version,
            r.training_data_version, r.sync_status, r.latency_ms,
            r.request_id as result_request_id, r.contract_version,
            r.created_at as result_created_at
     from public.ml_analysis_jobs j
     left join public.ml_analysis_results r on r.job_id=j.id and r.user_id=j.user_id
     where j.id=$1::uuid and j.user_id=$2::uuid
     limit 1`,
    [options.jobId, options.actorId],
  );
  const job = result.rows[0];
  if (!job) return null;

  const numericOrNull = (value: string | number | null) => {
    if (value === null) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  return {
    id: job.id,
    engine: job.engine,
    operation: job.operation,
    runtimeMode: job.runtime_mode,
    status: job.status,
    inputRecordRefs: job.input_record_refs,
    featureSchemaVersion: job.feature_schema_version,
    featuresMissing: job.features_missing,
    failureReason: job.failure_reason,
    analysis: job.result_id ? {
      id: job.result_id,
      resultType: job.result_type,
      readinessState: job.readiness_state,
      safetyState: job.safety_state,
      output: job.result_payload,
      runtimeMode: job.result_runtime_mode,
      coverage: numericOrNull(job.coverage),
      calibrationState: job.calibration_state,
      confidence: numericOrNull(job.confidence),
      confidenceLabel: job.confidence_label,
      uncertainty: job.uncertainty,
      limitations: job.limitations,
      confounders: job.confounders,
      evidenceState: job.evidence_state,
      featureSchemaVersion: job.result_feature_schema_version,
      inputRecordRefs: job.result_input_record_refs,
      featuresUsed: job.features_used,
      featuresMissing: job.result_features_missing,
      modelName: job.model_name,
      modelVersion: job.model_version,
      trainingDataVersion: job.training_data_version,
      syncStatus: job.sync_status,
      latencyMs: numericOrNull(job.latency_ms),
      requestId: job.result_request_id,
      contractVersion: job.contract_version,
      createdAt: job.result_created_at?.toISOString() ?? null,
    } : null,
    createdAt: job.created_at.toISOString(),
    updatedAt: job.updated_at.toISOString(),
  };
}
