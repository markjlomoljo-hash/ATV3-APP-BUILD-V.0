import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/db";
import type { DeletionRequestType } from "@/lib/acnetrex/deletion-requests";

export type DeletionStep =
  | "revoke_identity"
  | "delete_media"
  | "erase_data"
  | "delete_auth_identity";

export type ClaimedDeletionJob = {
  jobId: string;
  requestId: string;
  outboxId: string;
  userId: string;
  tombstoneId: string;
  requestType: DeletionRequestType;
  targetTable: string | null;
  targetId: string | null;
  currentStep: DeletionStep;
  completedSteps: DeletionStep[];
  attemptCount: number;
  maxAttempts: number;
  leaseOwner: string;
};

export type DeletionActionContext = {
  actorId: string;
  requestId: string;
  tombstoneId: string;
  requestType: DeletionRequestType;
  target: { table: string; id: string } | null;
  protectedRelations: readonly string[];
};

export type DeletionActions = {
  revokeIdentity?: (context: DeletionActionContext) => Promise<void>;
  deleteMedia?: (context: DeletionActionContext) => Promise<void>;
  eraseData?: (context: DeletionActionContext) => Promise<void>;
  deleteAuthIdentity?: (context: DeletionActionContext) => Promise<void>;
};

export type DeletionWorkerOutcome =
  | { status: "idle" }
  | { status: "step_completed"; jobId: string; requestId: string; step: DeletionStep; nextStep: DeletionStep }
  | { status: "completed"; jobId: string; requestId: string; step: DeletionStep }
  | { status: "retry_scheduled"; jobId: string; requestId: string; reason: string; attemptCount: number }
  | { status: "failed"; jobId: string; requestId: string; reason: string; attemptCount: number }
  | { status: "blocked"; jobId: string; requestId: string; reason: string }
  | { status: "lease_lost"; jobId: string; requestId: string };

const protectedRelations = Object.freeze([
  "public.deletion_requests",
  "public.deletion_jobs",
  "public.deletion_audit_events",
  "public.api_idempotency_keys",
  "public.outbox_events",
  "public.consumer_inbox",
]);

const stepTimestampColumn: Record<DeletionStep, string> = {
  revoke_identity: "identity_revoked_at",
  delete_media: "media_deleted_at",
  erase_data: "data_erased_at",
  delete_auth_identity: "auth_deleted_at",
};

export class DeletionActionError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly configuration: boolean;

  constructor(code: string, retryable: boolean, configuration = false) {
    const safeCode = /^[a-z][a-z0-9_]{2,79}$/.test(code) ? code : "deletion_action_failed";
    super(safeCode);
    this.name = "DeletionActionError";
    this.code = safeCode;
    this.retryable = retryable;
    this.configuration = configuration;
  }
}

class DeletionWorkerLeaseLostError extends Error {
  constructor() {
    super("deletion_worker_lease_lost");
    this.name = "DeletionWorkerLeaseLostError";
  }
}

export function deletionStepsForRequestType(requestType: DeletionRequestType): DeletionStep[] {
  if (requestType === "record") return ["erase_data"];
  if (requestType === "face_images" || requestType === "all_health_data") {
    return ["delete_media", "erase_data"];
  }
  return ["revoke_identity", "delete_media", "erase_data", "delete_auth_identity"];
}

export function boundedDeletionRetrySeconds(attemptCount: number): number {
  const exponent = Math.min(Math.max(Math.trunc(attemptCount) - 1, 0), 10);
  return Math.min(3_600, Math.max(1, 2 ** exponent * 15));
}

function safeWorkerId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)) {
    throw new Error("invalid_deletion_worker_id");
  }
  return value;
}

function contextFor(job: ClaimedDeletionJob): DeletionActionContext {
  return {
    actorId: job.userId,
    requestId: job.requestId,
    tombstoneId: job.tombstoneId,
    requestType: job.requestType,
    target: job.targetTable && job.targetId ? { table: job.targetTable, id: job.targetId } : null,
    protectedRelations,
  };
}

async function executeStep(
  job: ClaimedDeletionJob,
  actions: DeletionActions,
): Promise<void> {
  const action = {
    revoke_identity: actions.revokeIdentity,
    delete_media: actions.deleteMedia,
    erase_data: actions.eraseData,
    delete_auth_identity: actions.deleteAuthIdentity,
  }[job.currentStep];
  if (!action) {
    throw new DeletionActionError(
      `deletion_${job.currentStep}_not_configured`,
      false,
      true,
    );
  }
  await action(contextFor(job));
}

async function transaction<T>(client: PoolClient, operation: () => Promise<T>): Promise<T> {
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

async function insertAudit(
  client: PoolClient,
  job: ClaimedDeletionJob,
  eventType: string,
  metadata: Record<string, unknown>,
  retainActor = true,
): Promise<void> {
  await client.query(
    `insert into public.deletion_audit_events
       (user_id,deletion_request_id,tombstone_id,event_type,metadata)
     values ($1::uuid,$2::uuid,$3::uuid,$4,$5::jsonb)`,
    [
      retainActor ? job.userId : null,
      job.requestId,
      job.tombstoneId,
      eventType,
      JSON.stringify(metadata),
    ],
  );
}

type ExpiredLeaseRow = ClaimedDeletionJob & { leaseOwner: string };

export async function reapExpiredDeletionLeases(client: PoolClient): Promise<number> {
  const expired = await client.query<ExpiredLeaseRow>(
    `select j.id as "jobId",j.deletion_request_id as "requestId",
       o.id as "outboxId",j.user_id as "userId",j.tombstone_id as "tombstoneId",
       r.request_type as "requestType",r.target_table as "targetTable",
       r.target_id as "targetId",j.current_step as "currentStep",
       j.completed_steps as "completedSteps",j.attempt_count as "attemptCount",
       j.max_attempts as "maxAttempts",j.lease_owner as "leaseOwner"
     from public.deletion_jobs j
     join public.deletion_requests r on r.id=j.deletion_request_id
     join public.outbox_events o on o.aggregate_type='deletion_request'
       and o.aggregate_id=r.id::text and o.event_type='deletion.requested'
     where j.status='leased' and j.lease_expires_at <= now()
     order by j.lease_expires_at asc
     limit 20 for update of j,o skip locked`,
  );

  for (const job of expired.rows) {
    const terminal = Number(job.attemptCount) >= Number(job.maxAttempts);
    const nextStatus = terminal ? "dead_letter" : "queued";
    const outboxStatus = terminal ? "dead_letter" : "failed_retryable";
    const delay = boundedDeletionRetrySeconds(Number(job.attemptCount));
    const updatedJob = await client.query(
      `update public.deletion_jobs set status=$3,current_step=current_step,
         next_attempt_at=case when $3='queued' then now()+($4 * interval '1 second') else next_attempt_at end,
         last_error_code='deletion_lease_expired',lease_owner=null,lease_expires_at=null,updated_at=now()
       where id=$1::uuid and lease_owner=$2 and status='leased'`,
      [job.jobId, job.leaseOwner, nextStatus, delay],
    );
    if (updatedJob.rowCount !== 1) continue;
    await client.query(
      `update public.outbox_events set status=$3,
         next_attempt_at=case when $3='failed_retryable' then now()+($4 * interval '1 second') else next_attempt_at end,
         last_error_code='deletion_lease_expired',lease_owner=null,lease_expires_at=null,updated_at=now()
       where id=$1::uuid and lease_owner=$2 and status='leased'`,
      [job.outboxId, job.leaseOwner, outboxStatus, delay],
    );
    await client.query(
      `update public.deletion_requests set status=case when $2 then 'failed' else 'processing' end,
         last_error_code='deletion_lease_expired',attempt_count=$3,updated_at=now()
       where id=$1::uuid and status='processing'`,
      [job.requestId, terminal, job.attemptCount],
    );
    await insertAudit(client, job, terminal ? "deletion_dead_lettered" : "deletion_lease_expired", {
      attemptCount: job.attemptCount,
      currentStep: job.currentStep,
    });
  }
  return expired.rows.length;
}

export async function claimNextDeletionJob(
  client: PoolClient,
  workerId: string,
): Promise<ClaimedDeletionJob | null> {
  const leaseOwner = safeWorkerId(workerId);
  const result = await client.query<ClaimedDeletionJob>(
    `with candidate as (
       select j.id,j.deletion_request_id,j.user_id,j.tombstone_id,j.current_step,
         j.completed_steps,j.attempt_count,j.max_attempts,r.request_type,
         r.target_table,r.target_id,o.id as outbox_id
       from public.deletion_jobs j
       join public.deletion_requests r on r.id=j.deletion_request_id
       join public.outbox_events o on o.aggregate_type='deletion_request'
         and o.aggregate_id=r.id::text and o.event_type='deletion.requested'
       where j.status='queued' and j.next_attempt_at <= now()
         and j.grace_period_ends_at <= now()
         and r.status in ('scheduled','processing')
         and o.status in ('pending','failed_retryable') and o.next_attempt_at <= now()
       order by j.next_attempt_at,j.created_at,j.id
       limit 1 for update of j, o skip locked
     ), leased_job as (
       update public.deletion_jobs j set status='leased',lease_owner=$1,
         lease_expires_at=now()+interval '2 minutes',attempt_count=j.attempt_count+1,
         last_error_code=null,updated_at=now()
       from candidate c where j.id=c.id
       returning j.id as "jobId",j.deletion_request_id as "requestId",
         j.user_id as "userId",j.tombstone_id as "tombstoneId",
         j.current_step as "currentStep",j.completed_steps as "completedSteps",
         j.attempt_count as "attemptCount",j.max_attempts as "maxAttempts",
         j.lease_owner as "leaseOwner"
     ), leased_outbox as (
       update public.outbox_events o set status='leased',lease_owner=$1,
         lease_expires_at=now()+interval '2 minutes',attempt_count=o.attempt_count+1,
         last_error_code=null,updated_at=now()
       from candidate c where o.id=c.outbox_id
       returning o.id as "outboxId"
     ), marked_request as (
       update public.deletion_requests r set status='processing',
         current_step=c.current_step,attempt_count=c.attempt_count+1,
         last_error_code=null,updated_at=now()
       from candidate c where r.id=c.deletion_request_id
       returning r.id
     )
     select lj."jobId",lj."requestId",lo."outboxId",lj."userId",lj."tombstoneId",
       c.request_type as "requestType",c.target_table as "targetTable",
       c.target_id as "targetId",lj."currentStep",lj."completedSteps",
       lj."attemptCount",lj."maxAttempts",lj."leaseOwner"
     from candidate c join leased_job lj on lj."jobId"=c.id
     join leased_outbox lo on true join marked_request mr on mr.id=c.deletion_request_id`,
    [leaseOwner],
  );
  return result.rows[0] ?? null;
}

function nextStep(job: ClaimedDeletionJob): DeletionStep | null {
  const plan = deletionStepsForRequestType(job.requestType);
  if (!plan.includes(job.currentStep)) {
    throw new DeletionActionError("deletion_step_invalid", false);
  }
  const completed = new Set([...job.completedSteps, job.currentStep]);
  return plan.find((step) => !completed.has(step)) ?? null;
}

async function checkpointSuccess(
  client: PoolClient,
  job: ClaimedDeletionJob,
): Promise<DeletionWorkerOutcome> {
  const followingStep = nextStep(job);
  const jobStatus = followingStep ? "queued" : "completed";
  const requestStatus = followingStep ? "processing" : "completed";
  const outboxStatus = followingStep ? "pending" : "processed";
  const timestampColumn = stepTimestampColumn[job.currentStep];
  const actorStillExists = job.currentStep !== "delete_auth_identity";

  return transaction(client, async () => {
    const updatedJob = await client.query(
      `update public.deletion_jobs set status=$6,last_error_code=$3,
         completed_steps=completed_steps || $4::jsonb,current_step=$5,
         ${timestampColumn}=now(),completed_at=case when $6='completed' then now() else completed_at end,
         next_attempt_at=case when $6='queued' then now() else next_attempt_at end,
         lease_owner=null,lease_expires_at=null,updated_at=now()
       where id=$1::uuid and lease_owner=$2 and status='leased'`,
      [
        job.jobId,
        job.leaseOwner,
        null,
        JSON.stringify([job.currentStep]),
        followingStep ?? "completed",
        jobStatus,
      ],
    );
    if (updatedJob.rowCount !== 1) throw new DeletionWorkerLeaseLostError();

    const updatedRequest = await client.query(
      `update public.deletion_requests set status=$2,current_step=$3,last_error_code=null,
         completed_at=case when $2='completed' then now() else completed_at end,updated_at=now()
       where id=$1::uuid and status='processing'`,
      [job.requestId, requestStatus, followingStep ?? "completed"],
    );
    if (updatedRequest.rowCount !== 1) throw new DeletionWorkerLeaseLostError();

    const updatedOutbox = await client.query(
      `update public.outbox_events set status=$3,
         processed_at=case when $3='processed' then now() else processed_at end,
         next_attempt_at=case when $3='pending' then now() else next_attempt_at end,
         last_error_code=null,lease_owner=null,lease_expires_at=null,updated_at=now()
       where id=$1::uuid and lease_owner=$2 and status='leased'`,
      [job.outboxId, job.leaseOwner, outboxStatus],
    );
    if (updatedOutbox.rowCount !== 1) throw new DeletionWorkerLeaseLostError();

    await insertAudit(client, job, "deletion_step_completed", {
      step: job.currentStep,
      nextStep: followingStep,
      attemptCount: job.attemptCount,
    }, actorStillExists);

    if (!followingStep) {
      await insertAudit(client, job, "deletion_completed", {
        requestType: job.requestType,
        completedSteps: [...job.completedSteps, job.currentStep],
      }, actorStillExists);
      await client.query(
        `insert into public.consumer_inbox (consumer_name,event_id,result_reference)
         values ('deletion-worker',$1::uuid,
           jsonb_build_object('requestId',$2,'status','completed','tombstoneId',$3))
         on conflict (consumer_name,event_id) do nothing`,
        [job.outboxId, job.requestId, job.tombstoneId],
      );
      return { status: "completed", jobId: job.jobId, requestId: job.requestId, step: job.currentStep };
    }
    return {
      status: "step_completed",
      jobId: job.jobId,
      requestId: job.requestId,
      step: job.currentStep,
      nextStep: followingStep,
    };
  });
}

async function checkpointFailure(
  client: PoolClient,
  job: ClaimedDeletionJob,
  failure: DeletionActionError,
): Promise<DeletionWorkerOutcome> {
  const retry = failure.retryable && job.attemptCount < job.maxAttempts;
  const jobStatus = failure.configuration ? "blocked" : retry ? "queued" : "dead_letter";
  const requestStatus = failure.configuration ? "blocked" : retry ? "processing" : "failed";
  const outboxStatus = retry ? "failed_retryable" : "dead_letter";
  const delay = boundedDeletionRetrySeconds(job.attemptCount);

  return transaction(client, async () => {
    const updatedJob = await client.query(
      `update public.deletion_jobs set status=$3,last_error_code=$4,
         next_attempt_at=case when $3='queued' then now()+($5 * interval '1 second') else next_attempt_at end,
         lease_owner=null,lease_expires_at=null,updated_at=now()
       where id=$1::uuid and lease_owner=$2 and status='leased'`,
      [job.jobId, job.leaseOwner, jobStatus, failure.code, delay],
    );
    if (updatedJob.rowCount !== 1) throw new DeletionWorkerLeaseLostError();
    const updatedOutbox = await client.query(
      `update public.outbox_events set status=$3,last_error_code=$4,
         next_attempt_at=case when $3='failed_retryable' then now()+($5 * interval '1 second') else next_attempt_at end,
         lease_owner=null,lease_expires_at=null,updated_at=now()
       where id=$1::uuid and lease_owner=$2 and status='leased'`,
      [job.outboxId, job.leaseOwner, outboxStatus, failure.code, delay],
    );
    if (updatedOutbox.rowCount !== 1) throw new DeletionWorkerLeaseLostError();
    const updatedRequest = await client.query(
      `update public.deletion_requests set status=$2,last_error_code=$3,
         current_step=$4,attempt_count=$5,updated_at=now()
       where id=$1::uuid and status='processing'`,
      [job.requestId, requestStatus, failure.code, job.currentStep, job.attemptCount],
    );
    if (updatedRequest.rowCount !== 1) throw new DeletionWorkerLeaseLostError();

    await insertAudit(
      client,
      job,
      failure.configuration ? "deletion_blocked" : retry ? "deletion_retry_scheduled" : "deletion_dead_lettered",
      { code: failure.code, step: job.currentStep, attemptCount: job.attemptCount },
    );
    if (failure.configuration) {
      return { status: "blocked", jobId: job.jobId, requestId: job.requestId, reason: failure.code };
    }
    if (retry) {
      return {
        status: "retry_scheduled",
        jobId: job.jobId,
        requestId: job.requestId,
        reason: failure.code,
        attemptCount: job.attemptCount,
      };
    }
    return {
      status: "failed",
      jobId: job.jobId,
      requestId: job.requestId,
      reason: failure.code,
      attemptCount: job.attemptCount,
    };
  });
}

export async function processClaimedDeletionJob(
  client: PoolClient,
  job: ClaimedDeletionJob,
  actions: DeletionActions,
): Promise<DeletionWorkerOutcome> {
  try {
    await executeStep(job, actions);
    return await checkpointSuccess(client, job);
  } catch (error) {
    if (error instanceof DeletionWorkerLeaseLostError) {
      return { status: "lease_lost", jobId: job.jobId, requestId: job.requestId };
    }
    const failure = error instanceof DeletionActionError
      ? error
      : new DeletionActionError("deletion_action_failed", true);
    try {
      return await checkpointFailure(client, job, failure);
    } catch (checkpointError) {
      if (checkpointError instanceof DeletionWorkerLeaseLostError) {
        return { status: "lease_lost", jobId: job.jobId, requestId: job.requestId };
      }
      throw checkpointError;
    }
  }
}

export async function processNextDeletionJob(options: {
  workerId?: string;
  actions?: DeletionActions;
} = {}): Promise<DeletionWorkerOutcome> {
  const client = await getPool().connect();
  const workerId = options.workerId ?? `deletion-worker-${randomUUID()}`;
  try {
    await client.query("begin");
    await reapExpiredDeletionLeases(client);
    const job = await claimNextDeletionJob(client, workerId);
    await client.query("commit");
    if (!job) return { status: "idle" };
    return processClaimedDeletionJob(client, job, options.actions ?? {});
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function processDeletionBatch(options: {
  maxJobs?: number;
  workerId?: string;
  actions?: DeletionActions;
} = {}): Promise<DeletionWorkerOutcome[]> {
  const maxJobs = Math.min(Math.max(Math.trunc(options.maxJobs ?? 1), 1), 10);
  const outcomes: DeletionWorkerOutcome[] = [];
  for (let index = 0; index < maxJobs; index += 1) {
    const outcome = await processNextDeletionJob(options);
    outcomes.push(outcome);
    if (outcome.status === "idle" || outcome.status === "blocked") break;
  }
  return outcomes;
}
