import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { getPool } from "@/db";
import { executeIdempotent } from "@/lib/reliability/idempotency";

const deletionTargetTableSchema = z.enum([
  "sleep_logs",
  "food_logs",
  "face_scans",
  "reports",
  "treatment_plans",
  "treatment_tasks",
  "skin_twin_snapshots",
  "user_memory_events",
  "cutisai_conversations",
]);

export const deletionRequestInputSchema = z.object({
  requestType: z.enum(["record", "face_images", "all_health_data", "account"]),
  target: z.object({
    table: deletionTargetTableSchema,
    id: z.string().uuid(),
  }).strict().optional(),
  exportRequestedFirst: z.boolean(),
  confirmed: z.literal(true),
}).strict().superRefine((value, context) => {
  if (value.requestType === "record" && !value.target) {
    context.addIssue({ code: "custom", message: "A record deletion target is required", path: ["target"] });
  }
  if (value.requestType !== "record" && value.target) {
    context.addIssue({ code: "custom", message: "Only record deletion accepts a target", path: ["target"] });
  }
});

export type DeletionRequestInput = z.infer<typeof deletionRequestInputSchema>;
export type DeletionRequestType = DeletionRequestInput["requestType"];

export const deletionRequestStatusSchema = z.object({
  id: z.string().uuid(),
  requestType: z.enum(["record", "face_images", "all_health_data", "account"]),
  status: z.enum(["pending", "scheduled", "processing", "completed", "cancelled", "failed", "blocked"]),
  exportRequestedFirst: z.boolean(),
  currentStep: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().min(1).max(100),
  lastErrorCode: z.string().nullable(),
  requestedAt: z.string().datetime(),
  gracePeriodEndsAt: z.string().datetime().nullable(),
  scheduledPurgeAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
}).strict();

export type DeletionRequestStatus = z.infer<typeof deletionRequestStatusSchema>;

type DeletionStatusRow = {
  id: string;
  requestType: DeletionRequestType;
  status: DeletionRequestStatus["status"];
  exportRequestedFirst: boolean;
  currentStep: string | null;
  attemptCount: number;
  maxAttempts?: number | null;
  lastErrorCode: string | null;
  requestedAt: Date | string;
  gracePeriodEndsAt: Date | string | null;
  scheduledPurgeAt: Date | string | null;
  cancelledAt: Date | string | null;
  completedAt: Date | string | null;
};

type CancellationRow = {
  id: string;
  status: DeletionRequestStatus["status"];
  jobId: string | null;
  jobStatus: string | null;
  outboxId: string | null;
  outboxStatus: string | null;
  gracePeriodEndsAt: Date | null;
  cancellable?: boolean;
};

const GRACE_PERIOD_DAYS = 14;
const MAX_ATTEMPTS = 10;
const RECENT_AUTHENTICATION_MINUTES = 15;

export class DeletionRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "DeletionRequestError";
    this.code = code;
  }
}

function iso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new DeletionRequestError("deletion_state_invalid");
  return date.toISOString();
}

function mapStatus(row: DeletionStatusRow): DeletionRequestStatus {
  return deletionRequestStatusSchema.parse({
    id: row.id,
    requestType: row.requestType,
    status: row.status,
    exportRequestedFirst: row.exportRequestedFirst,
    currentStep: row.currentStep,
    attemptCount: Number(row.attemptCount),
    maxAttempts: Number(row.maxAttempts ?? MAX_ATTEMPTS),
    lastErrorCode: row.lastErrorCode,
    requestedAt: iso(row.requestedAt),
    gracePeriodEndsAt: iso(row.gracePeriodEndsAt),
    scheduledPurgeAt: iso(row.scheduledPurgeAt),
    cancelledAt: iso(row.cancelledAt),
    completedAt: iso(row.completedAt),
  });
}

async function requireRecentAuthentication(client: PoolClient, actorId: string): Promise<void> {
  const result = await client.query<{ recent: boolean }>(
    `select (last_sign_in_at is not null
      and last_sign_in_at >= now() - ($2 * interval '1 minute')) as recent
     from auth.users where id=$1::uuid`,
    [actorId, RECENT_AUTHENTICATION_MINUTES],
  );
  if (result.rows[0]?.recent !== true) {
    throw new DeletionRequestError("recent_authentication_required");
  }
}

function firstStep(requestType: DeletionRequestType): string {
  if (requestType === "account") return "revoke_identity";
  if (requestType === "face_images" || requestType === "all_health_data") return "delete_media";
  return "erase_data";
}

export async function createDeletionRequest(options: {
  actorId: string;
  idempotencyKey: string;
  input: DeletionRequestInput;
}): Promise<{ request: DeletionRequestStatus; replayed: boolean }> {
  const input = deletionRequestInputSchema.parse(options.input);
  const result = await executeIdempotent({
    actorId: options.actorId,
    scope: "deletion-request-create",
    key: options.idempotencyKey,
    method: "POST",
    route: "/api/deletions",
    payload: input,
    execute: async (client) => {
      await requireRecentAuthentication(client, options.actorId);
      await client.query("select pg_advisory_xact_lock(hashtextextended($1::text, 0))", [options.actorId]);

      const active = await client.query<{ id: string }>(
        `select id from public.deletion_requests
         where user_id=$1::uuid and status in ('pending','scheduled','processing')
         order by requested_at desc limit 1 for update`,
        [options.actorId],
      );
      if (active.rows[0]) throw new DeletionRequestError("active_deletion_request_exists");

      const tombstoneId = randomUUID();
      const inserted = await client.query<DeletionStatusRow>(
        `insert into public.deletion_requests
           (user_id, request_type, target_table, target_id, status,
            export_requested_first, idempotency_key, grace_period_ends_at,
            scheduled_purge_at, current_step, attempt_count, tombstone_id,
            requested_at, updated_at)
         values ($1::uuid,$2,$3,$4::uuid,'scheduled',$5,$6,
                 now()+($7 * interval '1 day'),now()+($7 * interval '1 day'),
                 'awaiting_grace_period',0,$8::uuid,now(),now())
         returning id, request_type as "requestType", status,
           export_requested_first as "exportRequestedFirst", current_step as "currentStep",
           attempt_count as "attemptCount", last_error_code as "lastErrorCode",
           requested_at as "requestedAt", grace_period_ends_at as "gracePeriodEndsAt",
           scheduled_purge_at as "scheduledPurgeAt", cancelled_at as "cancelledAt",
           completed_at as "completedAt"`,
        [
          options.actorId,
          input.requestType,
          input.target?.table ?? null,
          input.target?.id ?? null,
          input.exportRequestedFirst,
          options.idempotencyKey,
          GRACE_PERIOD_DAYS,
          tombstoneId,
        ],
      );
      const row = inserted.rows[0];
      if (!row) throw new DeletionRequestError("deletion_request_create_missing");

      const deletionJob = await client.query<{ id: string }>(
        `insert into public.deletion_jobs
           (deletion_request_id,user_id,tombstone_id,idempotency_key,status,current_step,
            completed_steps,attempt_count,max_attempts,next_attempt_at,grace_period_ends_at,
            created_at,updated_at)
         values ($1::uuid,$2::uuid,$3::uuid,$4,'queued',$5,'[]'::jsonb,0,$6,
                 $7::timestamptz,$7::timestamptz,now(),now())
         returning id`,
        [
          row.id,
          options.actorId,
          tombstoneId,
          options.idempotencyKey,
          firstStep(input.requestType),
          MAX_ATTEMPTS,
          row.gracePeriodEndsAt,
        ],
      );
      if (!deletionJob.rows[0]) throw new DeletionRequestError("deletion_job_create_missing");

      const outbox = await client.query<{ id: string }>(
        `insert into public.outbox_events
           (event_type,aggregate_type,aggregate_id,user_id,payload,deduplication_key,
            status,attempt_count,max_attempts,next_attempt_at,created_at,updated_at)
         values ('deletion.requested','deletion_request',$1,$2::uuid,$3::jsonb,$4,
                 'pending',0,$5,$6::timestamptz,now(),now())
         returning id`,
        [
          row.id,
          options.actorId,
          JSON.stringify({ requestId: row.id, requestType: input.requestType, tombstoneId }),
          `deletion-request:${row.id}`,
          MAX_ATTEMPTS,
          row.gracePeriodEndsAt,
        ],
      );
      if (!outbox.rows[0]) throw new DeletionRequestError("deletion_outbox_create_missing");

      await client.query(
        `insert into public.deletion_audit_events
           (user_id,deletion_request_id,tombstone_id,event_type,metadata)
         values ($1::uuid,$2::uuid,$3::uuid,'deletion_requested',$4::jsonb)`,
        [
          options.actorId,
          row.id,
          tombstoneId,
          JSON.stringify({
            requestType: input.requestType,
            exportRequestedFirst: input.exportRequestedFirst,
            targetTable: input.target?.table ?? null,
            gracePeriodDays: GRACE_PERIOD_DAYS,
          }),
        ],
      );

      const request = mapStatus({ ...row, maxAttempts: MAX_ATTEMPTS });
      return {
        status: 201,
        reference: { request },
        resourceType: "deletion_request",
        resourceId: row.id,
      };
    },
  });

  return {
    request: deletionRequestStatusSchema.parse(result.reference.request),
    replayed: result.replayed,
  };
}

const deletionStatusSelect = `select r.id, r.request_type as "requestType", r.status,
  r.export_requested_first as "exportRequestedFirst",
  coalesce(j.current_step,r.current_step) as "currentStep",
  coalesce(j.attempt_count,r.attempt_count,0) as "attemptCount",
  coalesce(j.max_attempts,10) as "maxAttempts",
  coalesce(j.last_error_code,r.last_error_code) as "lastErrorCode",
  r.requested_at as "requestedAt", r.grace_period_ends_at as "gracePeriodEndsAt",
  r.scheduled_purge_at as "scheduledPurgeAt", r.cancelled_at as "cancelledAt",
  r.completed_at as "completedAt"
  from public.deletion_requests r
  left join public.deletion_jobs j on j.deletion_request_id=r.id`;

export async function getDeletionRequest(options: {
  actorId: string;
  requestId: string;
}): Promise<DeletionRequestStatus | null> {
  const result = await getPool().query<DeletionStatusRow>(
    `${deletionStatusSelect} where r.id=$2::uuid and r.user_id=$1::uuid limit 1`,
    [options.actorId, options.requestId],
  );
  return result.rows[0] ? mapStatus(result.rows[0]) : null;
}

export async function cancelDeletionRequest(options: {
  actorId: string;
  requestId: string;
  idempotencyKey: string;
}): Promise<{ requestId: string; status: "cancelled"; replayed: boolean }> {
  const result = await executeIdempotent({
    actorId: options.actorId,
    scope: "deletion-request-cancel",
    key: options.idempotencyKey,
    method: "DELETE",
    route: `/api/deletions/${options.requestId}`,
    payload: { requestId: options.requestId },
    execute: async (client) => {
      await requireRecentAuthentication(client, options.actorId);
      await client.query("select pg_advisory_xact_lock(hashtextextended($1::text, 0))", [options.actorId]);
      const selected = await client.query<CancellationRow>(
        `select r.id,r.status,j.id as "jobId",j.status as "jobStatus",
           o.id as "outboxId",o.status as "outboxStatus",
           r.grace_period_ends_at as "gracePeriodEndsAt",
           (r.status in ('pending','scheduled') and j.status='queued'
             and o.status in ('pending','failed_retryable')
             and now() < r.grace_period_ends_at) as cancellable
         from public.deletion_requests r
         left join public.deletion_jobs j on j.deletion_request_id=r.id
         left join public.outbox_events o on o.aggregate_type='deletion_request'
           and o.aggregate_id=r.id::text and o.event_type='deletion.requested'
         where r.user_id=$1::uuid and r.id=$2::uuid
         for update of r,j,o`,
        [options.actorId, options.requestId],
      );
      const row = selected.rows[0];
      if (!row) throw new DeletionRequestError("deletion_request_not_found");
      if (row.status === "cancelled") {
        return {
          status: 200,
          reference: { requestId: row.id, status: "cancelled" },
          resourceType: "deletion_request",
          resourceId: row.id,
        };
      }
      const inferredCancellable = row.status === "scheduled"
        && row.jobStatus === "queued"
        && (row.outboxStatus === "pending" || row.outboxStatus === "failed_retryable")
        && row.gracePeriodEndsAt !== null
        && row.gracePeriodEndsAt.getTime() > Date.now();
      if (row.cancellable !== true && !inferredCancellable) {
        throw new DeletionRequestError("deletion_cancellation_window_closed");
      }
      if (!row.jobId || !row.outboxId) throw new DeletionRequestError("deletion_delivery_state_missing");

      const cancelledRequest = await client.query(
        `update public.deletion_requests set status='cancelled',cancelled_at=now(),
           current_step='cancelled',last_error_code=null,updated_at=now()
         where id=$1::uuid and user_id=$2::uuid and status in ('pending','scheduled')
           and now() < grace_period_ends_at`,
        [row.id, options.actorId],
      );
      const cancelledJob = await client.query(
        `update public.deletion_jobs set status='cancelled',cancelled_at=now(),
           current_step='cancelled',lease_owner=null,lease_expires_at=null,updated_at=now()
         where id=$1::uuid and deletion_request_id=$2::uuid and status='queued'`,
        [row.jobId, row.id],
      );
      const cancelledOutbox = await client.query(
        `update public.outbox_events set status='processed',processed_at=now(),
           last_error_code='deletion_cancelled',lease_owner=null,lease_expires_at=null,updated_at=now()
         where id=$1::uuid and aggregate_id=$2 and status in ('pending','failed_retryable')`,
        [row.outboxId, row.id],
      );
      if (cancelledRequest.rowCount !== 1 || cancelledJob.rowCount !== 1 || cancelledOutbox.rowCount !== 1) {
        throw new DeletionRequestError("deletion_state_changed");
      }
      await client.query(
        `insert into public.deletion_audit_events
           (user_id,deletion_request_id,tombstone_id,event_type,metadata)
         select $1::uuid,r.id,r.tombstone_id,'deletion_cancelled',
           jsonb_build_object('cancelledDuringGracePeriod',true)
         from public.deletion_requests r where r.id=$2::uuid`,
        [options.actorId, row.id],
      );
      return {
        status: 200,
        reference: { requestId: row.id, status: "cancelled" },
        resourceType: "deletion_request",
        resourceId: row.id,
      };
    },
  });

  const reference = z.object({
    requestId: z.string().uuid(),
    status: z.literal("cancelled"),
  }).strict().parse(result.reference);
  return { ...reference, replayed: result.replayed };
}
