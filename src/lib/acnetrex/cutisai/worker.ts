// AcneTrex V3 — CutisAI reply generation worker.
//
// Mirrors the ML analysis worker contract: durable outbox claim with
// `for update skip locked` leases, bounded retries with backoff, idempotent
// completion, and honest terminal failure states (consent_required,
// conversation_unavailable, llm_provider_not_configured). The worker never
// fabricates a reply: generation is delegated to the provider resolved from
// CUTISAI_LLM_PROVIDER (deterministic tier by default), and a provider that
// cannot run fails closed instead of inventing output.
import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/db";
import { resolveCutisAiProvider, type CutisAiReply } from "./provider";
import { extractExplicitMemoryFacts, persistExtractedMemoryFacts } from "./memory-extraction";
import { CUTISAI_REPLY_EVENT_TYPE } from "./worker-contract";

export { CUTISAI_REPLY_EVENT_TYPE } from "./worker-contract";

type ClaimedReplyJob = {
  outboxId: string;
  messageId: string;
  conversationId: string;
  userId: string;
  content: string;
  attemptCount: number;
  maxAttempts: number;
};

export type CutisAiWorkerOutcome =
  | { status: "idle" }
  | { status: "completed"; messageId: string; replyMessageId: string; replayed: boolean }
  | { status: "retry_scheduled"; messageId: string; reason: string; attemptCount: number }
  | { status: "failed"; messageId: string; reason: string; attemptCount: number }
  | { status: "not_configured"; reason: string };

function boundedRetryDelaySeconds(attemptCount: number): number {
  return Math.min(300, Math.max(5, 2 ** Math.min(attemptCount, 6) * 5));
}

function queryHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function claimNext(client: PoolClient, workerId: string): Promise<ClaimedReplyJob | null> {
  const result = await client.query<ClaimedReplyJob>(
    `with candidate as (
       select o.id as "outboxId", o.aggregate_id as "messageId", o.attempt_count as "attemptCount",
              o.max_attempts as "maxAttempts", m.user_id as "userId",
              m.conversation_id as "conversationId", m.content
       from public.outbox_events o
       join public.cutisai_messages m on m.id::text = o.aggregate_id
       where o.event_type = '${CUTISAI_REPLY_EVENT_TYPE}'
         and (o.status = 'pending' or (o.status = 'processing' and o.lease_expires_at < now()))
         and o.next_attempt_at <= now()
         and m.deleted_at is null and m.role = 'user'
       order by o.created_at asc
       for update of o skip locked
       limit 1
     )
     update public.outbox_events o
     set status='processing', lease_owner=$1, lease_expires_at=now()+interval '2 minutes',
         attempt_count=o.attempt_count+1, updated_at=now()
     from candidate c where o.id=c."outboxId"
     returning c."outboxId", c."messageId", c."attemptCount" + 1 as "attemptCount",
               c."maxAttempts", c."userId", c."conversationId", c.content`,
    [workerId],
  );
  return result.rows[0] ?? null;
}

async function updateRetry(client: PoolClient, job: ClaimedReplyJob, reason: string, terminal: boolean) {
  if (terminal) {
    await client.query(
      `update public.outbox_events set status='failed', last_error_code=$2, lease_owner=null,
       lease_expires_at=null, updated_at=now() where id=$1::uuid`,
      [job.outboxId, reason],
    );
    return;
  }
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

async function markProcessed(client: PoolClient, outboxId: string) {
  await client.query(
    `update public.outbox_events set status='processed', processed_at=now(), lease_owner=null,
     lease_expires_at=null, updated_at=now() where id=$1::uuid`,
    [outboxId],
  );
}

async function existingReplyId(client: PoolClient, job: ClaimedReplyJob): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    `select id from public.cutisai_messages
      where conversation_id = $1::uuid and user_id = $2::uuid and role = 'assistant'
        and tool_payload->>'replyToMessageId' = $3 and deleted_at is null
      limit 1`,
    [job.conversationId, job.userId, job.messageId],
  );
  return result.rows[0]?.id ?? null;
}

async function conversationIsWritable(client: PoolClient, job: ClaimedReplyJob): Promise<boolean> {
  const result = await client.query<{ id: string }>(
    `select id from public.cutisai_conversations
      where id = $1::uuid and user_id = $2::uuid and deleted_at is null and status <> 'deleted'
      limit 1`,
    [job.conversationId, job.userId],
  );
  return Boolean(result.rows[0]);
}

async function hasPersonalLearningConsent(client: PoolClient, userId: string): Promise<boolean> {
  const result = await client.query<{ personalLearning: boolean }>(
    `select personal_learning as "personalLearning" from public.consents
      where user_id = $1::uuid limit 1`,
    [userId],
  );
  return result.rows[0]?.personalLearning === true;
}

async function persistReply(client: PoolClient, job: ClaimedReplyJob, generated: CutisAiReply): Promise<string> {
  const messageResult = await client.query<{ id: string }>(
    `insert into public.cutisai_messages
       (user_id, conversation_id, role, content, tool_name, tool_payload,
        evidence_refs, runtime_mode, model_name, model_version)
     values ($1::uuid, $2::uuid, 'assistant', $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
     returning id`,
    [
      job.userId,
      job.conversationId,
      generated.content,
      generated.modelName,
      JSON.stringify({
        replyToMessageId: job.messageId,
        intentId: generated.intentId,
        evidenceStatus: generated.evidenceStatus,
      }),
      JSON.stringify(generated.evidenceRefs),
      generated.runtimeMode,
      generated.modelName,
      generated.modelVersion,
    ],
  );
  const replyMessageId = messageResult.rows[0]?.id;
  if (!replyMessageId) throw new Error("cutisai_reply_insert_missing");

  await client.query(
    `update public.cutisai_conversations set last_message_at = now(), updated_at = now()
      where id = $1::uuid and user_id = $2::uuid`,
    [job.conversationId, job.userId],
  );

  await client.query(
    `insert into public.memory_retrieval_logs
       (user_id, conversation_id, query_hash, retrieved_fact_ids, retrieved_event_ids, runtime_mode, result_count)
     values ($1::uuid, $2::uuid, $3, $4::uuid[], '{}'::uuid[], $5, $6)`,
    [
      job.userId,
      job.conversationId,
      queryHash(job.content),
      generated.retrievedMemoryFactIds,
      generated.runtimeMode,
      generated.evidenceRefs.length,
    ],
  );

  // Memory extraction covers only facts the user explicitly stated in the
  // triggering message; a message without an explicit statement writes nothing.
  const facts = extractExplicitMemoryFacts(job.content);
  if (facts.length > 0) {
    await persistExtractedMemoryFacts(client, {
      userId: job.userId,
      sourceMessageId: job.messageId,
      facts,
    });
  }

  await client.query(
    `insert into public.audit_logs
       (user_id, actor_type, action, target_table, target_id, metadata)
     values ($1::uuid, 'system', 'cutisai_reply_generated', 'cutisai_messages', $2::uuid, $3::jsonb)`,
    [
      job.userId,
      replyMessageId,
      JSON.stringify({
        intentId: generated.intentId,
        evidenceStatus: generated.evidenceStatus,
        evidenceCount: generated.evidenceRefs.length,
        extractedFactCount: facts.length,
        runtimeMode: generated.runtimeMode,
      }),
    ],
  );

  return replyMessageId;
}

async function processClaimedJob(client: PoolClient, job: ClaimedReplyJob): Promise<CutisAiWorkerOutcome> {
  const resolution = await resolveCutisAiProvider();
  if (!resolution.ok) {
    await withFinalizeTransaction(client, () => updateRetry(client, job, resolution.error, true));
    return { status: "not_configured", reason: resolution.error };
  }

  try {
    return await withFinalizeTransaction(client, async (): Promise<CutisAiWorkerOutcome> => {
      const replayedId = await existingReplyId(client, job);
      if (replayedId) {
        await markProcessed(client, job.outboxId);
        return { status: "completed", messageId: job.messageId, replyMessageId: replayedId, replayed: true };
      }

      if (!(await conversationIsWritable(client, job))) {
        await updateRetry(client, job, "conversation_unavailable", true);
        return {
          status: "failed",
          messageId: job.messageId,
          reason: "conversation_unavailable",
          attemptCount: job.attemptCount,
        };
      }

      if (!(await hasPersonalLearningConsent(client, job.userId))) {
        // Consent was revoked after the message was queued: fail closed and
        // write nothing derived from the message content.
        await updateRetry(client, job, "consent_required", true);
        return {
          status: "failed",
          messageId: job.messageId,
          reason: "consent_required",
          attemptCount: job.attemptCount,
        };
      }

      const generation = await resolution.provider.generate({
        client,
        userId: job.userId,
        message: job.content,
      });
      if (generation.status !== "generated") {
        const terminal = job.attemptCount >= job.maxAttempts;
        await updateRetry(client, job, generation.reason, terminal);
        return terminal
          ? { status: "failed", messageId: job.messageId, reason: generation.reason, attemptCount: job.attemptCount }
          : {
              status: "retry_scheduled",
              messageId: job.messageId,
              reason: generation.reason,
              attemptCount: job.attemptCount,
            };
      }

      const replyMessageId = await persistReply(client, job, generation.reply);
      await markProcessed(client, job.outboxId);
      return { status: "completed", messageId: job.messageId, replyMessageId, replayed: false };
    });
  } catch (error) {
    const reason =
      error instanceof Error && /^[a-z0-9_]{1,80}$/.test(error.message)
        ? error.message
        : "cutisai_reply_generation_failed";
    const terminal = job.attemptCount >= job.maxAttempts;
    await withFinalizeTransaction(client, () => updateRetry(client, job, reason, terminal)).catch(() => undefined);
    return terminal
      ? { status: "failed", messageId: job.messageId, reason, attemptCount: job.attemptCount }
      : { status: "retry_scheduled", messageId: job.messageId, reason, attemptCount: job.attemptCount };
  }
}

export async function processNextCutisAiReplyJob(options: { workerId?: string } = {}): Promise<CutisAiWorkerOutcome> {
  const client = await getPool().connect();
  const workerId = options.workerId ?? `cutisai-worker-${randomUUID()}`;
  try {
    await client.query("begin");
    const job = await claimNext(client, workerId);
    if (!job) {
      await client.query("commit");
      return { status: "idle" };
    }
    await client.query("commit");
    return await processClaimedJob(client, job);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function processCutisAiReplyBatch(options: { maxJobs?: number; workerId?: string } = {}) {
  const maxJobs = Math.min(Math.max(Math.floor(options.maxJobs ?? 1), 1), 10);
  const outcomes: CutisAiWorkerOutcome[] = [];
  for (let index = 0; index < maxJobs; index += 1) {
    const outcome = await processNextCutisAiReplyJob(options);
    outcomes.push(outcome);
    if (outcome.status === "idle" || outcome.status === "not_configured") break;
  }
  return outcomes;
}
