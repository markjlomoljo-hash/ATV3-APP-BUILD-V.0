import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/db";
import { hasPredictionPayload, isRecord, type MlAnalysisRequest } from "@/lib/acnetrex/ml-analysis-jobs";

type WorkerFetcher = typeof fetch;

type ClaimedJob = {
  outboxId: string;
  jobId: string;
  userId: string;
  engine: MlAnalysisRequest["engine"];
  operation: string;
  inputRecordRefs: unknown;
  features: unknown;
  featureSchemaVersion: string | null;
  appVersion: string | null;
  attemptCount: number;
  maxAttempts: number;
};

export type MlWorkerOutcome =
  | { status: "idle" }
  | { status: "completed"; jobId: string; outboxId: string }
  | { status: "retry_scheduled"; jobId: string; reason: string; attemptCount: number }
  | { status: "failed"; jobId: string; reason: string; attemptCount: number }
  | { status: "not_configured"; reason: string };

function configuredCloudRun(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.ACNETREX_ML_API_URL?.trim();
  const secret = process.env.ACNETREX_ML_SHARED_SECRET?.trim();
  if (!baseUrl || !secret) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), secret };
}

function boundedTimeoutMs(): number {
  const raw = Number(process.env.ML_WORKER_TIMEOUT_MS ?? "15000");
  if (!Number.isFinite(raw)) return 15_000;
  return Math.min(Math.max(Math.floor(raw), 1_000), 60_000);
}

function boundedRetryDelaySeconds(attemptCount: number): number {
  return Math.min(300, Math.max(5, 2 ** Math.min(attemptCount, 6) * 5));
}

function stringOrNull(value: unknown, maxLength = 160): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length <= 160).slice(0, 100);
}

function uuidOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function skinTwinSnapshotId(job: ClaimedJob): string | null {
  if (job.engine !== "skin_twin" || !isRecord(job.features)) return null;
  return uuidOrNull(job.features.snapshotId);
}

function failureReason(status: number, payload: unknown): string {
  if (isRecord(payload) && typeof payload.error === "string" && payload.error.length <= 160) return payload.error;
  return `ml_upstream_http_${status}`;
}

function shouldRetry(status: number, attemptCount: number, maxAttempts: number): boolean {
  return (status === 408 || status === 429 || status >= 500) && attemptCount < maxAttempts;
}

async function claimNext(client: PoolClient, workerId: string): Promise<ClaimedJob | null> {
  const result = await client.query<ClaimedJob>(
    `with candidate as (
       select o.id as "outboxId", o.aggregate_id as "jobId", o.attempt_count as "attemptCount",
              o.max_attempts as "maxAttempts", j.user_id as "userId", j.engine, j.operation,
              j.input_record_refs as "inputRecordRefs", j.features, j.feature_schema_version as "featureSchemaVersion",
              j.app_version as "appVersion"
       from public.outbox_events o
       join public.ml_analysis_jobs j on j.id::text = o.aggregate_id
       where o.event_type = 'ml.analysis.requested'
         and (o.status = 'pending' or (o.status = 'processing' and o.lease_expires_at < now()))
         and o.next_attempt_at <= now() and j.status = 'queued'
       order by o.created_at asc
       for update of o, j skip locked
       limit 1
     )
     update public.outbox_events o
     set status='processing', lease_owner=$1, lease_expires_at=now()+interval '2 minutes',
         attempt_count=o.attempt_count+1, updated_at=now()
     from candidate c where o.id=c."outboxId"
     returning c."outboxId", c."jobId", c."attemptCount" + 1 as "attemptCount",
               c."maxAttempts", c."userId", c.engine, c.operation, c."inputRecordRefs",
               c.features, c."featureSchemaVersion", c."appVersion"`,
    [workerId],
  );
  const job = result.rows[0];
  if (!job) return null;
  await client.query(
    `update public.ml_analysis_jobs set status='processing', updated_at=now()
     where id=$1::uuid and status='queued'`,
    [job.jobId],
  );
  return job;
}

async function updateRetry(client: PoolClient, job: ClaimedJob, reason: string, terminal: boolean) {
  if (terminal) {
    await client.query(
      `update public.ml_analysis_jobs set status='failed', failure_reason=$2, updated_at=now() where id=$1::uuid`,
      [job.jobId, reason],
    );
    await client.query(
      `update public.outbox_events set status='failed', last_error_code=$2, lease_owner=null,
       lease_expires_at=null, updated_at=now() where id=$1::uuid`,
      [job.outboxId, reason],
    );
    return;
  }

  await client.query(
    `update public.ml_analysis_jobs set status='queued', failure_reason=$2, updated_at=now() where id=$1::uuid`,
    [job.jobId, reason],
  );
  await client.query(
    `update public.outbox_events set status='pending', next_attempt_at=now()+($2 * interval '1 second'),
     last_error_code=$3, lease_owner=null, lease_expires_at=null, updated_at=now() where id=$1::uuid`,
    [job.outboxId, boundedRetryDelaySeconds(job.attemptCount), reason],
  );
}

async function withFinalizeTransaction<T>(client: PoolClient, operation: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    const result = await operation();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
}

async function persistSuccess(client: PoolClient, job: ClaimedJob, payload: Record<string, unknown>) {
  const metadata = isRecord(payload.metadata) ? payload.metadata : payload;
  await client.query(
    `insert into public.ml_analysis_results
       (user_id, job_id, engine, operation, runtime_mode, model_name, model_version,
        training_data_version, feature_schema_version, input_record_refs, features_used,
        features_missing, confidence, limitations, result, sync_status)
     values ($1::uuid,$2::uuid,$3,$4,'cloud_run',$5,$6,$7,$8,$9::jsonb,$10::jsonb,
             $11::jsonb,$12,$13::jsonb,$14::jsonb,'synced')
     on conflict (job_id) do nothing`,
    [
      job.userId,
      job.jobId,
      job.engine,
      job.operation,
      stringOrNull(metadata.modelName),
      stringOrNull(metadata.modelVersion),
      stringOrNull(metadata.trainingDataVersion),
      job.featureSchemaVersion,
      JSON.stringify(job.inputRecordRefs ?? []),
      JSON.stringify(stringArray(metadata.featuresUsed)),
      JSON.stringify(stringArray(metadata.featuresMissing)),
      numberOrNull(metadata.confidence),
      JSON.stringify(stringArray(metadata.limitations)),
      JSON.stringify(payload),
    ],
  );
  if (job.engine === "skin_twin") {
    const snapshotId = skinTwinSnapshotId(job);
    if (!snapshotId) throw new Error("skin_twin_snapshot_reference_missing");
    const updated = await client.query(
      `update public.skin_twin_snapshots
          set status='completed', simulation=$3::jsonb, model_version=$4,
              confidence=$5, uncertainty=$6::jsonb, updated_at=now()
        where id=$1::uuid and user_id=$2::uuid and status='queued_for_cloud'`,
      [
        snapshotId,
        job.userId,
        JSON.stringify(payload),
        stringOrNull(metadata.modelVersion),
        numberOrNull(metadata.confidence),
        JSON.stringify(metadata.uncertainty ?? null),
      ],
    );
    if (updated.rowCount !== 1) throw new Error("skin_twin_snapshot_update_missing");
  }
  await client.query(
    `update public.ml_analysis_jobs set status='completed', failure_reason=null, updated_at=now() where id=$1::uuid`,
    [job.jobId],
  );
  await client.query(
    `update public.outbox_events set status='processed', processed_at=now(), lease_owner=null,
     lease_expires_at=null, updated_at=now() where id=$1::uuid`,
    [job.outboxId],
  );
}

async function processClaimedJob(client: PoolClient, job: ClaimedJob, fetcher: WorkerFetcher): Promise<MlWorkerOutcome> {
  const cloud = configuredCloudRun();
  if (!cloud) {
    await updateRetry(client, job, "ml_cloud_not_configured", true);
    return { status: "not_configured", reason: "ml_cloud_not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), boundedTimeoutMs());
  try {
    const response = await fetcher(`${cloud.baseUrl}/predict`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${cloud.secret}`,
        "idempotency-key": `worker:${job.jobId}`,
        "x-request-id": `ml-worker:${job.jobId}`,
      },
      body: JSON.stringify({
        engine: job.engine,
        operation: job.operation,
        inputRecordRefs: job.inputRecordRefs ?? [],
        features: job.features ?? {},
        metadata: { featureSchemaVersion: job.featureSchemaVersion, appVersion: job.appVersion },
      }),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : null;
    if (!payload || !response.ok || !hasPredictionPayload(payload)) {
      const reason = payload && !response.ok ? failureReason(response.status, payload) : "ml_api_unexpected_response";
      const terminal = !shouldRetry(response.status, job.attemptCount, job.maxAttempts);
      await withFinalizeTransaction(client, () => updateRetry(client, job, reason, terminal));
      return terminal
        ? { status: "failed", jobId: job.jobId, reason, attemptCount: job.attemptCount }
        : { status: "retry_scheduled", jobId: job.jobId, reason, attemptCount: job.attemptCount };
    }
    await withFinalizeTransaction(client, () => persistSuccess(client, job, payload));
    return { status: "completed", jobId: job.jobId, outboxId: job.outboxId };
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError"
      ? "ml_api_timeout"
      : error instanceof Error && error.message.startsWith("skin_twin_snapshot_")
        ? "ml_result_persistence_failed"
        : "ml_api_unreachable";
    const terminal = job.attemptCount >= job.maxAttempts;
    await withFinalizeTransaction(client, () => updateRetry(client, job, reason, terminal));
    return terminal
      ? { status: "failed", jobId: job.jobId, reason, attemptCount: job.attemptCount }
      : { status: "retry_scheduled", jobId: job.jobId, reason, attemptCount: job.attemptCount };
  } finally {
    clearTimeout(timeout);
  }
}

export async function processNextMlAnalysisJob(options: { workerId?: string; fetcher?: WorkerFetcher } = {}): Promise<MlWorkerOutcome> {
  const client = await getPool().connect();
  const workerId = options.workerId ?? `ml-worker-${randomUUID()}`;
  try {
    await client.query("begin");
    const job = await claimNext(client, workerId);
    if (!job) {
      await client.query("commit");
      return { status: "idle" };
    }
    await client.query("commit");
    return await processClaimedJob(client, job, options.fetcher ?? fetch);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function processMlAnalysisBatch(options: { maxJobs?: number; workerId?: string; fetcher?: WorkerFetcher } = {}) {
  const maxJobs = Math.min(Math.max(Math.floor(options.maxJobs ?? 1), 1), 10);
  const outcomes: MlWorkerOutcome[] = [];
  for (let index = 0; index < maxJobs; index += 1) {
    const outcome = await processNextMlAnalysisJob(options);
    outcomes.push(outcome);
    if (outcome.status === "idle" || outcome.status === "not_configured") break;
  }
  return outcomes;
}
