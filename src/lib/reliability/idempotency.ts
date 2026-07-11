import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "../../db";

export type IdempotencyStatus = "processing" | "completed" | "failed_retryable" | "failed_terminal" | "expired";

export interface StoredOperation {
  requestHash: string;
  status: IdempotencyStatus;
  responseStatus: number | null;
  responseReference: Record<string, unknown>;
}

export type IdempotencyDecision =
  | { kind: "execute" }
  | { kind: "replay"; status: number; reference: Record<string, unknown> }
  | { kind: "conflict" }
  | { kind: "processing" };

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function requestHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function decideIdempotency(stored: StoredOperation | null, hash: string, reserved: boolean): IdempotencyDecision {
  if (reserved) return { kind: "execute" };
  if (!stored) return { kind: "processing" };
  if (stored.requestHash !== hash) return { kind: "conflict" };
  if (stored.status === "completed" || stored.status === "failed_terminal") {
    return { kind: "replay", status: stored.responseStatus ?? 200, reference: stored.responseReference };
  }
  return { kind: "processing" };
}

export interface IdempotentResult {
  status: number;
  reference: Record<string, unknown>;
  resourceType?: string;
  resourceId?: string;
}

export async function executeIdempotent(options: {
  actorId: string;
  scope: string;
  key: string;
  method: string;
  route: string;
  payload: unknown;
  execute: (client: PoolClient) => Promise<IdempotentResult>;
}): Promise<IdempotentResult & { replayed: boolean }> {
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(options.key)) throw new Error("invalid_idempotency_key");
  const hash = requestHash(options.payload);
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into public.api_idempotency_keys
       (actor_id, scope, idempotency_key, http_method, route, request_hash, status, expires_at)
       values ($1::uuid,$2,$3,$4,$5,$6,'processing',now()+interval '7 days')
       on conflict (actor_id,scope,idempotency_key) do nothing returning id`,
      [options.actorId, options.scope, options.key, options.method, options.route, hash],
    );
    const rowResult = await client.query(
      `select request_hash as "requestHash",status,response_status as "responseStatus",
              response_reference as "responseReference"
       from public.api_idempotency_keys
       where actor_id=$1::uuid and scope=$2 and idempotency_key=$3 for update`,
      [options.actorId, options.scope, options.key],
    );
    const decision = decideIdempotency(rowResult.rows[0] ?? null, hash, inserted.rowCount === 1);
    if (decision.kind === "conflict") throw new Error("idempotency_key_reused_with_different_payload");
    if (decision.kind === "processing") throw new Error("operation_in_progress");
    if (decision.kind === "replay") {
      await client.query("commit");
      return { status: decision.status, reference: decision.reference, replayed: true };
    }

    const result = await options.execute(client);
    await client.query(
      `update public.api_idempotency_keys set status='completed',response_status=$4,
       response_reference=$5::jsonb,resource_type=$6,resource_id=$7,completed_at=now(),updated_at=now()
       where actor_id=$1::uuid and scope=$2 and idempotency_key=$3`,
      [options.actorId, options.scope, options.key, result.status, JSON.stringify(result.reference), result.resourceType ?? null, result.resourceId ?? null],
    );
    await client.query("commit");
    return { ...result, replayed: false };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
