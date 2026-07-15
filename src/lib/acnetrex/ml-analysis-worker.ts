import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/db";
import { isRecord, mlTask, type MlAnalysisRequest } from "@/lib/acnetrex/ml-analysis-jobs";
import { skinTwinScenarioSchema } from "@/lib/acnetrex/modules/schemas";
import {
  inferenceRequestSchema,
  inferenceResponseSchema,
  type InferenceResponse,
} from "../../../packages/ml-local-runtime/src/contracts";

type WorkerFetcher = typeof fetch;
type MlPersistenceOwner = "nextjs" | "railway";

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
  personalProcessing: boolean;
  rawImageProcessing: boolean;
  anonymousLearning: boolean;
  requestId: string | null;
  idempotencyKey: string | null;
  consentSnapshot: unknown;
  leaseOwner: string;
  attemptCount: number;
  maxAttempts: number;
};

export type MlWorkerOutcome =
  | { status: "idle" }
  | { status: "completed"; jobId: string; outboxId: string }
  | { status: "retry_scheduled"; jobId: string; reason: string; attemptCount: number }
  | { status: "failed"; jobId: string; reason: string; attemptCount: number }
  | { status: "lease_lost"; jobId: string; outboxId: string }
  | { status: "not_configured"; reason: string };

class MlWorkerLeaseLostError extends Error {
  constructor() {
    super("ml_worker_lease_lost");
  }
}

class MlResultPersistenceError extends Error {
  constructor(cause: unknown) {
    super("ml_result_persistence_failed", { cause });
  }
}

class MlCommitVerificationError extends Error {
  constructor() {
    super("ml_commit_verification_failed");
  }
}

function configuredPersistenceOwner(): MlPersistenceOwner {
  const value = process.env.ACNETREX_ML_PERSISTENCE_OWNER?.trim() || "nextjs";
  if (value === "nextjs" || value === "railway") return value;
  throw new Error("invalid_acnetrex_ml_persistence_owner");
}

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

function uuidOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function skinTwinSnapshotId(job: ClaimedJob): string | null {
  if (job.engine !== "skin_twin" || !isRecord(job.features)) return null;
  return uuidOrNull(job.features.snapshotId);
}

function canonicalTask(engine: ClaimedJob["engine"], operation: string): string {
  return mlTask({ engine, operation });
}

function referencedIds(value: unknown, table: string): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || item.table !== table || typeof item.id !== "string") return [];
    return uuidOrNull(item.id) ? [item.id] : [];
  });
}

async function verifiedInputRecordRefs(client: PoolClient, job: ClaimedJob): Promise<string[]> {
  const source = job.engine === "faceatlas"
    ? { table: "face_scans", sql: "public.face_scans" }
    : job.engine === "dermdiet"
      ? { table: "food_logs", sql: "public.food_logs" }
      : job.engine === "triggergraph"
        ? { table: "daily_logs", sql: "public.daily_logs" }
        : job.engine === "forecast"
          ? { table: "face_scans", sql: "public.face_scans" }
          : job.engine === "cutisai"
            ? { table: "cutisai_messages", sql: "public.cutisai_messages" }
            : null;
  if (!source) return [];
  const ids = referencedIds(job.inputRecordRefs, source.table);
  if (ids.length === 0) return [];
  let result: { rows: Array<{ id: string }> };
  const parameters = [job.userId, ids];
  switch (source.sql) {
    case "public.face_scans":
      result = await client.query<{ id: string }>(
        `select record.id from public.face_scans record
         join unnest($2::uuid[]) with ordinality requested(id, ordinal) on record.id=requested.id
         where record.user_id=$1::uuid
         order by requested.ordinal`,
        parameters,
      );
      break;
    case "public.food_logs":
      result = await client.query<{ id: string }>(
        `select record.id from public.food_logs record
         join unnest($2::uuid[]) with ordinality requested(id, ordinal) on record.id=requested.id
         where record.user_id=$1::uuid
         order by requested.ordinal`,
        parameters,
      );
      break;
    case "public.daily_logs":
      result = await client.query<{ id: string }>(
        `select record.id from public.daily_logs record
         join unnest($2::uuid[]) with ordinality requested(id, ordinal) on record.id=requested.id
         where record.user_id=$1::uuid
         order by requested.ordinal`,
        parameters,
      );
      break;
    case "public.cutisai_messages":
      result = await client.query<{ id: string }>(
        `select record.id from public.cutisai_messages record
         join unnest($2::uuid[]) with ordinality requested(id, ordinal) on record.id=requested.id
         where record.user_id=$1::uuid
         order by requested.ordinal`,
        parameters,
      );
      break;
    default:
      return [];
  }
  return result.rows.map((row) => `${source.table}:${row.id}`);
}

function validIsoTimestamp(value: Date | string | null): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function safeCount(value: number | string | undefined): number {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

async function canonicalSkinTwinInputs(client: PoolClient, job: ClaimedJob): Promise<{
  inputs: Record<string, unknown>;
  inputRecordRefs: string[];
}> {
  const snapshotId = skinTwinSnapshotId(job);
  if (!snapshotId) return { inputs: {}, inputRecordRefs: [] };
  const result = await client.query<{
    id: string;
    scenarioPayload: unknown;
    faceScans: number | string;
    sleepLogs: number | string;
    foodLogs: number | string;
  }>(
    `select snapshot.id, snapshot.scenario_payload as "scenarioPayload",
            (select count(*) from public.face_scans where user_id=$1::uuid) as "faceScans",
            (select count(*) from public.sleep_logs where user_id=$1::uuid) as "sleepLogs",
            (select count(*) from public.food_logs where user_id=$1::uuid) as "foodLogs"
       from public.skin_twin_snapshots snapshot
      where snapshot.user_id=$1::uuid and snapshot.id=$2::uuid
        and snapshot.status='queued_for_cloud'
      limit 1`,
    [job.userId, snapshotId],
  );
  const row = result.rows[0];
  if (!row) return { inputs: {}, inputRecordRefs: [] };
  const scenario = skinTwinScenarioSchema.safeParse(row.scenarioPayload);
  if (!scenario.success) {
    return { inputs: {}, inputRecordRefs: [`skin_twin_snapshots:${row.id}`] };
  }
  const horizonByWindow = { "3d": 3, "7d": 7, "14d": 14, "30d": 30 } as const;
  const horizon = scenario.data.window in horizonByWindow
    ? horizonByWindow[scenario.data.window as keyof typeof horizonByWindow]
    : null;
  return {
    inputs: {
      baseline: {
        face_scans: safeCount(row.faceScans),
        sleep_logs: safeCount(row.sleepLogs),
        food_logs: safeCount(row.foodLogs),
      },
      changes: Object.fromEntries(scenario.data.variables.map((variable) => [variable, true])),
      horizon_days: horizon,
    },
    inputRecordRefs: [`skin_twin_snapshots:${row.id}`],
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function canonicalForecastInputs(client: PoolClient, job: ClaimedJob): Promise<{
  inputs: Record<string, unknown>;
  inputRecordRefs: string[];
}> {
  const sleep = await client.query<{
    id: string;
    sleepTime: Date | string | null;
    wakeTime: Date | string | null;
  }>(
    `select id, sleep_time as "sleepTime", wake_time as "wakeTime"
       from public.sleep_logs
      where user_id=$1::uuid and log_date >= current_date - interval '28 days'
      order by log_date asc, id asc
      limit 60`,
    [job.userId],
  );
  const stress = await client.query<{ id: string; stressLevel: number | string | null }>(
    `select id, stress_level as "stressLevel"
       from public.daily_logs
      where user_id=$1 and log_date >= (current_date - interval '28 days')::text
        and stress_level is not null
      order by log_date asc, id asc
      limit 60`,
    [job.userId],
  );
  const sleepHours = sleep.rows.flatMap((row) => {
    if (!row.sleepTime || !row.wakeTime) return [];
    const start = new Date(row.sleepTime).getTime();
    const end = new Date(row.wakeTime).getTime();
    const hours = (end - start) / 3_600_000;
    return Number.isFinite(hours) && hours >= 2 && hours <= 16 ? [hours] : [];
  });
  const stressScores = stress.rows.flatMap((row) => {
    const score = Number(row.stressLevel);
    return Number.isFinite(score) && score >= 0 && score <= 10 ? [score] : [];
  });
  const meanSleep = average(sleepHours);
  const meanStress = average(stressScores);
  return {
    inputs: {
      ...(meanSleep === null ? {} : { sleep_hours: meanSleep }),
      ...(meanStress === null ? {} : { stress_score: meanStress }),
    },
    inputRecordRefs: [
      ...sleep.rows.map((row) => `sleep_logs:${row.id}`),
      ...stress.rows.map((row) => `daily_logs:${row.id}`),
    ],
  };
}

async function canonicalInputs(client: PoolClient, job: ClaimedJob): Promise<{
  inputs: Record<string, unknown>;
  inputRecordRefs: string[];
}> {
  if (job.engine === "skin_twin") return canonicalSkinTwinInputs(client, job);
  if (job.engine === "forecast" && job.operation === "flare_direction") {
    return canonicalForecastInputs(client, job);
  }
  if (job.engine !== "sleepderm") {
    return {
      // Client feature maps are never authoritative. Until an engine has a
      // server-side feature builder, send no derived inputs so the inference
      // contract returns an honest insufficient/unavailable state.
      inputs: {},
      inputRecordRefs: await verifiedInputRecordRefs(client, job),
    };
  }

  const ids = referencedIds(job.inputRecordRefs, "sleep_logs");
  if (ids.length === 0) return { inputs: { records: [] }, inputRecordRefs: [] };
  const result = await client.query<{
    id: string;
    logDate: string;
    sleepTime: Date | string | null;
    wakeTime: Date | string | null;
  }>(
    `select id, log_date::text as "logDate", sleep_time as "sleepTime",
            wake_time as "wakeTime"
       from public.sleep_logs
      where user_id=$1::uuid and id=any($2::uuid[])
      order by log_date asc, id asc`,
    [job.userId, ids],
  );
  const records = result.rows.flatMap((row) => {
    if (!row.sleepTime || !row.wakeTime) return [];
    const bedtime = validIsoTimestamp(row.sleepTime);
    const wakeTime = validIsoTimestamp(row.wakeTime);
    if (!bedtime || !wakeTime) return [];
    return [{ date: row.logDate, bedtime, wake_time: wakeTime }];
  });
  return {
    inputs: { records },
    inputRecordRefs: result.rows.map((row) => `sleep_logs:${row.id}`),
  };
}

async function canonicalRequest(client: PoolClient, job: ClaimedJob, owner: MlPersistenceOwner) {
  const canonical = owner === "railway"
    ? { inputs: {}, inputRecordRefs: [] }
    : await canonicalInputs(client, job);
  return inferenceRequestSchema.parse({
    contract_version: "1.0.0",
    request_id: job.jobId,
    idempotency_key: job.jobId,
    module: job.engine,
    task: canonicalTask(job.engine, job.operation),
    runtime_preference: "cloud",
    feature_schema_version: "1.0.0",
    input_record_refs: canonical.inputRecordRefs,
    inputs: canonical.inputs,
    context: { timezone: "UTC", locale: "en" },
    consent: {
      personal_processing: job.personalProcessing,
      raw_image_processing: job.rawImageProcessing,
      anonymous_learning: job.anonymousLearning,
    },
  });
}

function failureReason(status: number, payload: unknown): string {
  const safeCode = (value: unknown) =>
    typeof value === "string" && /^[a-z0-9_]{1,80}$/.test(value) ? value : null;
  if (isRecord(payload)) {
    const direct = safeCode(payload.error);
    if (direct) return direct;
    if (isRecord(payload.error)) {
      const nested = safeCode(payload.error.code);
      if (nested) return nested;
    }
    if (isRecord(payload.detail)) {
      const detail = safeCode(payload.detail.code);
      if (detail) return detail;
    }
  }
  return `ml_upstream_http_${status}`;
}

function shouldRetry(status: number, reason: string, attemptCount: number, maxAttempts: number): boolean {
  return (status === 408 || status === 429 || status >= 500 || (status === 409 && reason === "operation_in_progress"))
    && attemptCount < maxAttempts;
}

function jobStatusFor(response: InferenceResponse): "completed" | "failed" | "insufficient_data" | "not_configured" {
  if (response.readiness_state === "insufficient_data") return "insufficient_data";
  if (response.readiness_state === "error_retryable" || response.readiness_state === "error_terminal") return "failed";
  if ([
    "not_configured",
    "unsupported_offline",
    "consent_restricted",
    "model_unavailable",
    "evidence_unavailable",
  ].includes(response.readiness_state)) return "not_configured";
  return "completed";
}

async function deadLetterExhaustedLeases(client: PoolClient, owner: MlPersistenceOwner) {
  const exhausted = await client.query<{ jobId: string }>(
    `with exhausted as (
       select o.id, o.aggregate_id as "jobId"
       from public.outbox_events o
       join public.ml_analysis_jobs j on j.id::text=o.aggregate_id
       where o.event_type='ml.analysis.requested'
         and o.status='leased' and o.lease_expires_at < now()
         and o.attempt_count >= o.max_attempts
         and j.status='processing'
       for update of o, j skip locked
     )
     update public.outbox_events o
     set status='dead_letter', last_error_code='ml_worker_lease_expired',
         lease_owner=null, lease_expires_at=null, updated_at=now()
     from exhausted e where o.id=e.id
     returning e."jobId"`,
  );
  const jobIds = exhausted.rows.map((row) => row.jobId);
  if (jobIds.length === 0 || owner === "railway") return;
  await client.query(
    `update public.ml_analysis_jobs
     set status='failed', failure_reason='ml_worker_lease_expired',
         error_class='worker_lease_exhausted', lease_owner=null, lease_expires_at=null,
         dead_lettered_at=now(), updated_at=now()
     where id=any($1::uuid[]) and status='processing'`,
    [jobIds],
  );
}

async function claimNext(
  client: PoolClient,
  workerId: string,
  owner: MlPersistenceOwner,
): Promise<ClaimedJob | null> {
  await deadLetterExhaustedLeases(client, owner);
  const eligibleState = owner === "railway"
    ? `(
          (o.status in ('pending', 'failed_retryable') and j.status in ('queued', 'processing'))
          or (o.status = 'leased' and o.lease_expires_at < now()
              and j.status in ('queued', 'processing', 'completed', 'failed', 'insufficient_data', 'not_configured'))
        )`
    : `(
          (o.status in ('pending', 'failed_retryable') and j.status = 'queued')
          or (o.status = 'leased' and o.lease_expires_at < now() and j.status = 'processing')
        )`;
  const result = await client.query<ClaimedJob>(
    `with candidate as (
       select o.id as "outboxId", o.aggregate_id as "jobId", o.attempt_count as "attemptCount",
              o.max_attempts as "maxAttempts", j.user_id as "userId", j.engine, j.operation,
              j.input_record_refs as "inputRecordRefs", j.features, j.feature_schema_version as "featureSchemaVersion",
               j.app_version as "appVersion", coalesce(c.personal_processing, false) as "personalProcessing",
               coalesce(c.raw_image_processing, false) as "rawImageProcessing",
               coalesce(c.anonymous_learning, false) as "anonymousLearning",
               j.request_id::text as "requestId", j.idempotency_key as "idempotencyKey",
               j.consent_snapshot as "consentSnapshot"
       from public.outbox_events o
       join public.ml_analysis_jobs j on j.id::text = o.aggregate_id
       left join public.consents c on c.user_id = j.user_id
       where o.event_type = 'ml.analysis.requested'
         and ${eligibleState}
          and o.attempt_count < o.max_attempts
          and o.next_attempt_at <= now()
          and (j.deadline_at is null or j.deadline_at > now())
          and j.cancelled_at is null
       order by o.created_at asc
       for update of o, j skip locked
       limit 1
     )
     update public.outbox_events o
      set status='leased', lease_owner=$1, lease_expires_at=now()+interval '2 minutes',
         attempt_count=o.attempt_count+1, updated_at=now()
     from candidate c where o.id=c."outboxId"
     returning c."outboxId", c."jobId", c."attemptCount" + 1 as "attemptCount",
               c."maxAttempts", c."userId", c.engine, c.operation, c."inputRecordRefs",
                c.features, c."featureSchemaVersion", c."appVersion", c."personalProcessing",
                c."rawImageProcessing", c."anonymousLearning", c."requestId",
                c."idempotencyKey", c."consentSnapshot"`,
    [workerId],
  );
  const job = result.rows[0];
  if (!job) return null;
  const claimed = { ...job, leaseOwner: workerId };
  if (owner === "railway") return claimed;
  const updated = await client.query(
    `update public.ml_analysis_jobs
     set status='processing', attempt_count=$2, lease_owner=$3,
         lease_expires_at=now()+interval '2 minutes', updated_at=now()
     where id=$1::uuid and status in ('queued', 'processing')`,
    [job.jobId, job.attemptCount, workerId],
  );
  if (updated.rowCount !== 1) throw new MlWorkerLeaseLostError();
  return claimed;
}

async function updateRetry(
  client: PoolClient,
  job: ClaimedJob,
  reason: string,
  terminal: boolean,
  owner: MlPersistenceOwner,
) {
  if (terminal) {
    const outbox = await client.query(
      `update public.outbox_events set status='dead_letter', last_error_code=$3, lease_owner=null,
       lease_expires_at=null, updated_at=now()
       where id=$1::uuid and lease_owner=$2 and status='leased'`,
      [job.outboxId, job.leaseOwner, reason],
    );
    if (outbox.rowCount !== 1) throw new MlWorkerLeaseLostError();
    if (owner === "railway") return;
    const failedJob = await client.query(
      `update public.ml_analysis_jobs
       set status='failed', failure_reason=$2, error_class='ml_upstream_terminal',
           lease_owner=null, lease_expires_at=null, dead_lettered_at=now(), updated_at=now()
       where id=$1::uuid and lease_owner=$3 and status='processing'`,
      [job.jobId, reason, job.leaseOwner],
    );
    if (failedJob.rowCount !== 1) throw new MlWorkerLeaseLostError();
    return;
  }

  const outbox = await client.query(
    `update public.outbox_events set status='failed_retryable', next_attempt_at=now()+($3 * interval '1 second'),
     last_error_code=$4, lease_owner=null, lease_expires_at=null, updated_at=now()
     where id=$1::uuid and lease_owner=$2 and status='leased'`,
    [job.outboxId, job.leaseOwner, boundedRetryDelaySeconds(job.attemptCount), reason],
  );
  if (outbox.rowCount !== 1) throw new MlWorkerLeaseLostError();
  if (owner === "railway") return;
  const requeuedJob = await client.query(
    `update public.ml_analysis_jobs
     set status='queued', failure_reason=$2, error_class='ml_upstream_retryable',
         next_attempt_at=now()+($4 * interval '1 second'), lease_owner=null,
         lease_expires_at=null, updated_at=now()
     where id=$1::uuid and lease_owner=$3 and status='processing'`,
    [job.jobId, reason, job.leaseOwner, boundedRetryDelaySeconds(job.attemptCount)],
  );
  if (requeuedJob.rowCount !== 1) throw new MlWorkerLeaseLostError();
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

async function persistSuccess(client: PoolClient, job: ClaimedJob, payload: InferenceResponse) {
  const durableStatus = jobStatusFor(payload);
  await client.query(
    `insert into public.ml_analysis_results
       (user_id, job_id, engine, operation, runtime_mode, model_name, model_version,
         training_data_version, feature_schema_version, input_record_refs, features_used,
         features_missing, confidence, limitations, result, sync_status, result_type,
         readiness_state, safety_state, coverage, calibration_state, confidence_label,
         uncertainty, confounders, evidence_state, latency_ms, request_id,
         idempotency_key, contract_version)
      values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,
              $12::jsonb,$13,$14::jsonb,$15::jsonb,'synced',$16,$17,$18,$19,$20,$21,
              $22::jsonb,$23::jsonb,$24,$25,$26::uuid,$27,'1.0.0')
      on conflict (job_id) do update set
        user_id=excluded.user_id, engine=excluded.engine, operation=excluded.operation,
        runtime_mode=excluded.runtime_mode, model_name=excluded.model_name,
        model_version=excluded.model_version, training_data_version=excluded.training_data_version,
        feature_schema_version=excluded.feature_schema_version,
        input_record_refs=excluded.input_record_refs, features_used=excluded.features_used,
        features_missing=excluded.features_missing, confidence=excluded.confidence,
        limitations=excluded.limitations, result=excluded.result, sync_status=excluded.sync_status,
        result_type=excluded.result_type, readiness_state=excluded.readiness_state,
        safety_state=excluded.safety_state, coverage=excluded.coverage,
        calibration_state=excluded.calibration_state, confidence_label=excluded.confidence_label,
        uncertainty=excluded.uncertainty, confounders=excluded.confounders,
        evidence_state=excluded.evidence_state, latency_ms=excluded.latency_ms,
        request_id=excluded.request_id, idempotency_key=excluded.idempotency_key,
        contract_version=excluded.contract_version`,
    [
      job.userId,
      job.jobId,
      job.engine,
      job.operation,
      payload.runtime_mode,
      payload.model_name,
      payload.model_version,
      payload.training_data_version,
      payload.feature_schema_version,
      JSON.stringify(payload.input_record_refs),
      JSON.stringify(payload.features_used),
      JSON.stringify(payload.features_missing),
      payload.confidence,
      JSON.stringify(payload.limitations),
      payload.result === null ? null : JSON.stringify(payload.result),
      payload.result_type,
      payload.readiness_state,
      payload.safety_state,
      payload.coverage,
      payload.calibration_state,
      payload.confidence_label,
      JSON.stringify(payload.uncertainty),
      JSON.stringify(payload.confounders),
      payload.evidence_state,
      payload.latency_ms,
      payload.request_id,
      job.idempotencyKey,
    ],
  );
  if (job.engine === "skin_twin") {
    const snapshotId = skinTwinSnapshotId(job);
    if (!snapshotId) throw new Error("skin_twin_snapshot_reference_missing");
    const snapshotStatus = durableStatus === "completed" && payload.result !== null
      ? "completed"
      : durableStatus === "insufficient_data"
        ? "insufficient_data"
        : "failed";
    const updated = await client.query(
      `update public.skin_twin_snapshots
          set status=$3, simulation=$4::jsonb, model_version=$5,
              confidence=$6, uncertainty=$7::jsonb, updated_at=now()
        where id=$1::uuid and user_id=$2::uuid and status='queued_for_cloud'`,
      [
        snapshotId,
        job.userId,
        snapshotStatus,
        payload.result === null ? null : JSON.stringify(payload.result),
        payload.model_version,
        payload.confidence,
        JSON.stringify(payload.uncertainty),
      ],
    );
    if (updated.rowCount !== 1) throw new Error("skin_twin_snapshot_update_missing");
  }
  const updatedJob = await client.query(
    `update public.ml_analysis_jobs
     set status=$2, failure_reason=null, error_class=null, lease_owner=null,
         lease_expires_at=null, updated_at=now()
     where id=$1::uuid and lease_owner=$3 and status='processing'`,
    [job.jobId, durableStatus, job.leaseOwner],
  );
  if (updatedJob.rowCount !== 1) throw new MlWorkerLeaseLostError();
  await client.query(
    `insert into public.consumer_inbox (consumer_name, event_id, result_reference)
     values ('railway-ml-worker',$1::uuid,
             jsonb_build_object('jobId',$2::uuid,'status',$3::text))
     on conflict (consumer_name, event_id) do nothing`,
    [job.outboxId, job.jobId, durableStatus],
  );
  const updatedOutbox = await client.query(
    `update public.outbox_events set status='processed', processed_at=now(), lease_owner=null,
     lease_expires_at=null, updated_at=now()
     where id=$1::uuid and lease_owner=$2 and status='leased'`,
    [job.outboxId, job.leaseOwner],
  );
  if (updatedOutbox.rowCount !== 1) throw new MlWorkerLeaseLostError();
}

async function verifyRailwayCommitAndCloseOutbox(
  client: PoolClient,
  job: ClaimedJob,
  payload: InferenceResponse,
) {
  const expectedStatus = jobStatusFor(payload);
  const committed = await client.query<{
    status: string;
    resultId: string | null;
    requestId: string | null;
    engine: string;
    operation: string;
  }>(
    `select j.status, j.engine, j.operation, r.id as "resultId", r.request_id::text as "requestId"
       from public.ml_analysis_jobs j
       left join public.ml_analysis_results r on r.job_id=j.id and r.user_id=j.user_id
      where j.id=$1::uuid and j.user_id=$2::uuid
      for update of j`,
    [job.jobId, job.userId],
  );
  const row = committed.rows[0];
  if (!row
    || row.status !== expectedStatus
    || !row.resultId
    || row.requestId !== job.jobId
    || row.engine !== job.engine
    || row.operation !== job.operation) {
    throw new MlCommitVerificationError();
  }
  await client.query(
    `insert into public.consumer_inbox (consumer_name, event_id, result_reference)
     values ('railway-ml-dispatcher',$1::uuid,
             jsonb_build_object('jobId',$2::uuid,'status',$3::text,'resultId',$4::uuid))
     on conflict (consumer_name, event_id) do nothing`,
    [job.outboxId, job.jobId, row.status, row.resultId],
  );
  const updatedOutbox = await client.query(
    `update public.outbox_events set status='processed', processed_at=now(), lease_owner=null,
     lease_expires_at=null, updated_at=now()
     where id=$1::uuid and lease_owner=$2 and status='leased'`,
    [job.outboxId, job.leaseOwner],
  );
  if (updatedOutbox.rowCount !== 1) throw new MlWorkerLeaseLostError();
}

async function processClaimedJob(
  client: PoolClient,
  job: ClaimedJob,
  fetcher: WorkerFetcher,
  owner: MlPersistenceOwner,
  shutdownSignal?: AbortSignal,
): Promise<MlWorkerOutcome> {
  const cloud = configuredCloudRun();
  if (!cloud) {
    try {
      await withFinalizeTransaction(client, () => updateRetry(client, job, "ml_cloud_not_configured", true, owner));
      return { status: "not_configured", reason: "ml_cloud_not_configured" };
    } catch (error) {
      if (error instanceof MlWorkerLeaseLostError) {
        return { status: "lease_lost", jobId: job.jobId, outboxId: job.outboxId };
      }
      throw error;
    }
  }

  const controller = new AbortController();
  const abortForShutdown = () => controller.abort(shutdownSignal?.reason);
  if (shutdownSignal?.aborted) abortForShutdown();
  else shutdownSignal?.addEventListener("abort", abortForShutdown, { once: true });
  const timeout = setTimeout(() => controller.abort(), boundedTimeoutMs());
  try {
    const canonical = await canonicalRequest(client, job, owner);
    const endpoint = owner === "railway" ? "/api/v1/inference" : "/predict";
    const response = await fetcher(`${cloud.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${cloud.secret}`,
        "idempotency-key": job.jobId,
        "x-request-id": canonical.request_id,
      },
      body: JSON.stringify(canonical),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : null;
    const parsed = inferenceResponseSchema.safeParse(payload);
    const contractStatusAccepted = response.ok || (owner === "nextjs" && response.status === 422);
    if (parsed.success && contractStatusAccepted) {
      const lineageMatches = parsed.data.request_id === job.jobId
        && parsed.data.job_id === job.jobId
        && parsed.data.module === canonical.module
        && parsed.data.task === canonical.task
        && parsed.data.feature_schema_version === canonical.feature_schema_version;
      if (!lineageMatches) {
        await withFinalizeTransaction(client, () => updateRetry(client, job, "ml_api_lineage_mismatch", true, owner));
        return {
          status: "failed",
          jobId: job.jobId,
          reason: "ml_api_lineage_mismatch",
          attemptCount: job.attemptCount,
        };
      }
      try {
        await withFinalizeTransaction(
          client,
          () => owner === "railway"
            ? verifyRailwayCommitAndCloseOutbox(client, job, parsed.data)
            : persistSuccess(client, job, parsed.data),
        );
      } catch (error) {
        if (error instanceof MlWorkerLeaseLostError) throw error;
        if (error instanceof MlCommitVerificationError) throw error;
        const databaseError = error as {
          code?: unknown;
          constraint?: unknown;
          table?: unknown;
          column?: unknown;
        };
        console.error("ml_result_persistence_failed", {
          code: typeof databaseError.code === "string" ? databaseError.code : "unknown",
          constraint: typeof databaseError.constraint === "string" ? databaseError.constraint : undefined,
          table: typeof databaseError.table === "string" ? databaseError.table : undefined,
          column: typeof databaseError.column === "string" ? databaseError.column : undefined,
        });
        throw new MlResultPersistenceError(error);
      }
      return { status: "completed", jobId: job.jobId, outboxId: job.outboxId };
    }

    const reason = payload && !response.ok ? failureReason(response.status, payload) : "ml_api_unexpected_response";
    const terminal = !shouldRetry(response.status, reason, job.attemptCount, job.maxAttempts);
    await withFinalizeTransaction(client, () => updateRetry(client, job, reason, terminal, owner));
    return terminal
      ? { status: "failed", jobId: job.jobId, reason, attemptCount: job.attemptCount }
      : { status: "retry_scheduled", jobId: job.jobId, reason, attemptCount: job.attemptCount };
  } catch (error) {
    if (error instanceof MlWorkerLeaseLostError) {
      return { status: "lease_lost", jobId: job.jobId, outboxId: job.outboxId };
    }
    const reason = shutdownSignal?.aborted
      ? "ml_worker_shutdown"
      : error instanceof DOMException && error.name === "AbortError"
        ? "ml_api_timeout"
      : error instanceof MlResultPersistenceError
        ? "ml_result_persistence_failed"
      : error instanceof MlCommitVerificationError
        ? "ml_commit_verification_failed"
        : "ml_api_unreachable";
    const terminal = job.attemptCount >= job.maxAttempts;
    try {
      await withFinalizeTransaction(client, () => updateRetry(client, job, reason, terminal, owner));
    } catch (finalizeError) {
      if (finalizeError instanceof MlWorkerLeaseLostError) {
        return { status: "lease_lost", jobId: job.jobId, outboxId: job.outboxId };
      }
      throw finalizeError;
    }
    return terminal
      ? { status: "failed", jobId: job.jobId, reason, attemptCount: job.attemptCount }
      : { status: "retry_scheduled", jobId: job.jobId, reason, attemptCount: job.attemptCount };
  } finally {
    clearTimeout(timeout);
    shutdownSignal?.removeEventListener("abort", abortForShutdown);
  }
}

export async function processNextMlAnalysisJob(options: {
  workerId?: string;
  fetcher?: WorkerFetcher;
  signal?: AbortSignal;
} = {}): Promise<MlWorkerOutcome> {
  const owner = configuredPersistenceOwner();
  const client = await getPool().connect();
  const workerId = options.workerId ?? `ml-worker-${randomUUID()}`;
  try {
    await client.query("begin");
    const job = await claimNext(client, workerId, owner);
    if (!job) {
      await client.query("commit");
      return { status: "idle" };
    }
    await client.query("commit");
    return await processClaimedJob(client, job, options.fetcher ?? fetch, owner, options.signal);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function processMlAnalysisBatch(options: {
  maxJobs?: number;
  workerId?: string;
  fetcher?: WorkerFetcher;
  signal?: AbortSignal;
} = {}) {
  const maxJobs = Math.min(Math.max(Math.floor(options.maxJobs ?? 1), 1), 10);
  const outcomes: MlWorkerOutcome[] = [];
  for (let index = 0; index < maxJobs; index += 1) {
    const outcome = await processNextMlAnalysisJob(options);
    outcomes.push(outcome);
    if (options.signal?.aborted || outcome.status === "idle" || outcome.status === "not_configured") break;
  }
  return outcomes;
}
