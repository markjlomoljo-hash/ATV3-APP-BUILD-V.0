import "server-only";

import { z } from "zod";
import { getPool } from "@/db";
import { executeIdempotent } from "@/lib/reliability/idempotency";

const inputRecordRefSchema = z.object({
  table: z.string().min(1).max(80),
  id: z.string().min(1).max(160),
});

export const mlAnalysisRequestSchema = z.object({
  engine: z.enum(["faceatlas", "sleepderm", "dermdiet", "triggergraph", "forecast", "skin_twin", "cutisai"]),
  operation: z.string().min(1).max(120),
  inputRecordRefs: z.array(inputRecordRefSchema).max(100).default([]),
  features: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
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

export type MlAnalysisJobReference = {
  ok: true;
  status: "queued_for_cloud";
  jobId: string;
  engine: MlAnalysisRequest["engine"];
  operation: string;
  runtimeMode: "queued_for_cloud";
  syncStatus: "pending";
};

export function mlFeatureSchemaVersion(request: MlAnalysisRequest): string | null {
  const value = request.metadata.featureSchemaVersion;
  return typeof value === "string" && value.length <= 80 ? value : null;
}

export function mlAppVersion(request: MlAnalysisRequest): string | null {
  const value = request.metadata.appVersion;
  return typeof value === "string" && value.length <= 80 ? value : null;
}

export async function enqueueMlAnalysisJob(options: {
  actorId: string;
  idempotencyKey: string;
  request: MlAnalysisRequest;
  requestId: string;
}): Promise<MlAnalysisJobReference & { replayed: boolean }> {
  const { actorId, idempotencyKey, request, requestId } = options;
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
          feature_schema_version, features, features_missing, app_version, schema_version)
         values ($1::uuid,$2,$3,'queued_for_cloud','queued',$4::jsonb,$5,$6::jsonb,
                 '[]'::jsonb,$7,'1')
         returning id, engine, operation`,
        [
          actorId,
          request.engine,
          request.operation,
          JSON.stringify(request.inputRecordRefs),
          mlFeatureSchemaVersion(request),
          JSON.stringify(request.features),
          mlAppVersion(request),
        ],
      );
      const job = inserted.rows[0];
      if (!job) throw new Error("ml_job_insert_missing");

      await client.query(
        `insert into public.outbox_events
         (event_type, aggregate_type, aggregate_id, user_id, payload, deduplication_key)
         values ('ml.analysis.requested','ml_analysis_job',$1,$2::uuid,$3::jsonb,$4)
         on conflict (deduplication_key) do nothing`,
        [
          job.id,
          actorId,
          JSON.stringify({ jobId: job.id, requestId, engine: job.engine, operation: job.operation }),
          `ml-analysis-job:${actorId}:${idempotencyKey}`,
        ],
      );

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

  const reference = result.reference as MlAnalysisJobReference;
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
    created_at: Date;
    updated_at: Date;
  }>(
    `select id, engine, operation, runtime_mode, status, input_record_refs,
            feature_schema_version, features_missing, failure_reason, created_at, updated_at
     from public.ml_analysis_jobs
     where id=$1::uuid and user_id=$2::uuid
     limit 1`,
    [options.jobId, options.actorId],
  );
  const job = result.rows[0];
  if (!job) return null;

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
    createdAt: job.created_at.toISOString(),
    updatedAt: job.updated_at.toISOString(),
  };
}
