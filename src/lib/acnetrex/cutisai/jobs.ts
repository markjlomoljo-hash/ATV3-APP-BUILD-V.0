// AcneTrex V3 — durable CutisAI reply job enqueue.
//
// Runs inside the caller's transaction (the same one that persisted the user
// message) so a reply job exists if and only if the message commit succeeds.
// Deduplication reuses the caller's idempotency key: a replayed POST enqueues
// nothing new.
import type { PoolClient } from "pg";
import { CUTISAI_REPLY_EVENT_TYPE } from "./worker-contract";

export async function enqueueCutisAiReplyJob(
  client: PoolClient,
  options: {
    userId: string;
    conversationId: string;
    messageId: string;
    idempotencyKey: string;
  },
): Promise<void> {
  await client.query(
    `insert into public.outbox_events
       (event_type, aggregate_type, aggregate_id, user_id, payload, deduplication_key)
     values ($1, 'cutisai_message', $2, $3::uuid, $4::jsonb, $5)
     on conflict (deduplication_key) do nothing`,
    [
      CUTISAI_REPLY_EVENT_TYPE,
      options.messageId,
      options.userId,
      JSON.stringify({ conversationId: options.conversationId, messageId: options.messageId }),
      `cutisai-reply:${options.userId}:${options.idempotencyKey}`,
    ],
  );
}
