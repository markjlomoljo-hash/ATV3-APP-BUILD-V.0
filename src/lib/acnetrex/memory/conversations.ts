import type { PoolClient } from "pg";
import { getPool } from "@/db";
import type { z } from "zod";
import { cutisAiMessageSchema } from "@/lib/acnetrex/modules/schemas";

export type CutisAiMessageInput = z.infer<typeof cutisAiMessageSchema>;

export type CutisAiConversation = {
  id: string;
  title: string | null;
  status: "active" | "archived" | "deleted";
  consentScope: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CutisAiMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  requestedTools: string[];
  runtimeMode: string | null;
  modelName: string | null;
  modelVersion: string | null;
  evidenceRefs: unknown[];
  createdAt: string;
};

export class CutisAiConsentRequiredError extends Error {
  constructor() {
    super("personal_learning_consent_required");
    this.name = "CutisAiConsentRequiredError";
  }
}

export class CutisAiConversationNotFoundError extends Error {
  constructor() {
    super("conversation_not_found");
    this.name = "CutisAiConversationNotFoundError";
  }
}

type ConversationRow = {
  id: string;
  title: string | null;
  status: CutisAiConversation["status"];
  consentScope: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type MessageRow = {
  id: string;
  conversationId: string;
  role: CutisAiMessage["role"];
  content: string;
  toolPayload: { requestedTools?: string[] } | null;
  runtimeMode: string | null;
  modelName: string | null;
  modelVersion: string | null;
  evidenceRefs: unknown[];
  createdAt: string;
};

function mapConversation(row: ConversationRow): CutisAiConversation {
  return row;
}

function mapMessage(row: MessageRow): CutisAiMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    requestedTools: row.toolPayload?.requestedTools ?? [],
    runtimeMode: row.runtimeMode,
    modelName: row.modelName,
    modelVersion: row.modelVersion,
    evidenceRefs: row.evidenceRefs,
    createdAt: row.createdAt,
  };
}

async function requirePersonalMemoryConsent(client: PoolClient, userId: string): Promise<void> {
  const result = await client.query<{ personalLearning: boolean }>(
    `select personal_learning as "personalLearning"
       from public.consents
      where user_id = $1::uuid
      limit 1`,
    [userId],
  );

  if (result.rows[0]?.personalLearning !== true) {
    throw new CutisAiConsentRequiredError();
  }
}

export async function recordCutisAiMessage(
  client: PoolClient,
  userId: string,
  input: CutisAiMessageInput,
): Promise<{ conversation: CutisAiConversation; message: CutisAiMessage }> {
  await requirePersonalMemoryConsent(client, userId);

  let conversation: ConversationRow | undefined;
  if (input.conversationId) {
    const conversationResult = await client.query<ConversationRow>(
      `select id, title, status, consent_scope as "consentScope",
              last_message_at as "lastMessageAt", created_at as "createdAt", updated_at as "updatedAt"
         from public.cutisai_conversations
        where id = $1::uuid and user_id = $2::uuid and deleted_at is null and status <> 'deleted'
        for update`,
      [input.conversationId, userId],
    );
    conversation = conversationResult.rows[0];
    if (!conversation) throw new CutisAiConversationNotFoundError();
  } else {
    const conversationResult = await client.query<ConversationRow>(
      `insert into public.cutisai_conversations (user_id, title, consent_scope)
       values ($1::uuid, $2, 'personal_memory')
       returning id, title, status, consent_scope as "consentScope",
                 last_message_at as "lastMessageAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [userId, input.message.trim().slice(0, 120)],
    );
    conversation = conversationResult.rows[0];
  }

  const messageResult = await client.query<MessageRow>(
    `insert into public.cutisai_messages
       (user_id, conversation_id, role, content, tool_payload, evidence_refs)
     values ($1::uuid, $2::uuid, 'user', $3, $4::jsonb, '[]'::jsonb)
     returning id, conversation_id as "conversationId", role, content,
               tool_payload as "toolPayload", runtime_mode as "runtimeMode",
               model_name as "modelName", model_version as "modelVersion",
               evidence_refs as "evidenceRefs", created_at as "createdAt"`,
    [userId, conversation.id, input.message.trim(), JSON.stringify({ requestedTools: input.requestedTools })],
  );
  const message = messageResult.rows[0];

  const updatedConversationResult = await client.query<ConversationRow>(
    `update public.cutisai_conversations
        set last_message_at = now(), updated_at = now()
      where id = $1::uuid and user_id = $2::uuid
      returning id, title, status, consent_scope as "consentScope",
                last_message_at as "lastMessageAt", created_at as "createdAt", updated_at as "updatedAt"`,
    [conversation.id, userId],
  );
  conversation = updatedConversationResult.rows[0] ?? conversation;

  await client.query(
    `insert into public.audit_logs
       (user_id, actor_type, action, target_table, target_id, metadata)
     values ($1::uuid, 'user', 'cutisai_message_recorded', 'cutisai_messages', $2::uuid, $3::jsonb)`,
    [userId, message.id, JSON.stringify({ requestedTools: input.requestedTools })],
  );

  return { conversation: mapConversation(conversation), message: mapMessage(message) };
}

export async function listCutisAiConversations(userId: string): Promise<CutisAiConversation[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await requirePersonalMemoryConsent(client, userId);
    const result = await client.query<ConversationRow>(
      `select id, title, status, consent_scope as "consentScope",
              last_message_at as "lastMessageAt", created_at as "createdAt", updated_at as "updatedAt"
         from public.cutisai_conversations
        where user_id = $1::uuid and deleted_at is null and status <> 'deleted'
        order by coalesce(last_message_at, created_at) desc
        limit 50`,
      [userId],
    );
    await client.query("commit");
    return result.rows.map(mapConversation);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getCutisAiConversation(userId: string, conversationId: string): Promise<{
  conversation: CutisAiConversation;
  messages: CutisAiMessage[];
}> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await requirePersonalMemoryConsent(client, userId);
    const conversationResult = await client.query<ConversationRow>(
      `select id, title, status, consent_scope as "consentScope",
              last_message_at as "lastMessageAt", created_at as "createdAt", updated_at as "updatedAt"
         from public.cutisai_conversations
        where id = $1::uuid and user_id = $2::uuid and deleted_at is null and status <> 'deleted'`,
      [conversationId, userId],
    );
    const conversation = conversationResult.rows[0];
    if (!conversation) throw new CutisAiConversationNotFoundError();

    const messagesResult = await client.query<MessageRow>(
      `select id, conversation_id as "conversationId", role, content,
              tool_payload as "toolPayload", runtime_mode as "runtimeMode",
              model_name as "modelName", model_version as "modelVersion",
              evidence_refs as "evidenceRefs", created_at as "createdAt"
         from public.cutisai_messages
        where conversation_id = $1::uuid and user_id = $2::uuid and deleted_at is null
        order by created_at asc
        limit 200`,
      [conversationId, userId],
    );
    await client.query("commit");
    return { conversation: mapConversation(conversation), messages: messagesResult.rows.map(mapMessage) };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
