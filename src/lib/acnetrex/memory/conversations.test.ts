import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getPool: vi.fn(),
}));

import { getPool } from "@/db";
import {
  CutisAiConsentRequiredError,
  getCutisAiConversation,
  listCutisAiConversations,
  recordCutisAiMessage,
} from "./conversations";

const pool = vi.mocked(getPool);
const userId = "00000000-0000-0000-0000-000000000001";
const conversationId = "11111111-1111-4111-8111-111111111111";

function clientWithResponses(responses: Array<{ rows?: unknown[] }>) {
  const query = vi.fn(async (..._args: unknown[]) => responses.shift() ?? { rows: [] });
  const client = {
    query,
    release: vi.fn(),
  } as unknown as PoolClient;
  return { client, query };
}

describe("CutisAI durable conversation service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires personal-learning consent before persisting message content", async () => {
    const { client } = clientWithResponses([{ rows: [{ personalLearning: false }] }]);
    await expect(
      recordCutisAiMessage(client, userId, { message: "Private question", requestedTools: [] }),
    ).rejects.toBeInstanceOf(CutisAiConsentRequiredError);
  });

  it("records a user message and audits only non-content metadata", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ personalLearning: true }] },
      {
        rows: [
          {
            id: conversationId,
            title: "A private question",
            status: "active",
            consentScope: "personal_memory",
            lastMessageAt: null,
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      },
      {
        rows: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            conversationId,
            role: "user",
            content: "A private question",
            toolPayload: { requestedTools: ["memory"] },
            runtimeMode: null,
            modelName: null,
            modelVersion: null,
            evidenceRefs: [],
            createdAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      },
      {
        rows: [
          {
            id: conversationId,
            title: "A private question",
            status: "active",
            consentScope: "personal_memory",
            lastMessageAt: "2026-07-13T00:00:00.000Z",
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      },
      { rows: [] },
    ]);

    const result = await recordCutisAiMessage(client, userId, {
      message: "A private question",
      requestedTools: ["memory"],
    });

    expect(result.message.content).toBe("A private question");
    expect(result.message.requestedTools).toEqual(["memory"]);
    const auditCall = query.mock.calls.at(-1);
    expect(auditCall?.[0]).toContain("insert into public.audit_logs");
    expect(JSON.stringify(auditCall?.[1])).not.toContain("A private question");
    expect(JSON.stringify(query.mock.calls)).toContain("user_id = $2::uuid");
  });

  it("appends to an owner-scoped conversation instead of creating a new one", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ personalLearning: true }] },
      {
        rows: [
          {
            id: conversationId,
            title: "Existing",
            status: "active",
            consentScope: "personal_memory",
            lastMessageAt: null,
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      },
      {
        rows: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            conversationId,
            role: "user",
            content: "Follow up",
            toolPayload: null,
            runtimeMode: null,
            modelName: null,
            modelVersion: null,
            evidenceRefs: [],
            createdAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      },
      { rows: [] },
      { rows: [] },
    ]);
    const result = await recordCutisAiMessage(client, userId, {
      conversationId,
      message: "Follow up",
      requestedTools: [],
    });
    expect(result.conversation.id).toBe(conversationId);
    expect(result.message.requestedTools).toEqual([]);
    expect(query.mock.calls.some(([text]) => String(text).includes("for update"))).toBe(true);
  });

  it("rejects an owner-scoped append when the conversation does not exist", async () => {
    const { client } = clientWithResponses([{ rows: [{ personalLearning: true }] }, { rows: [] }]);
    await expect(
      recordCutisAiMessage(client, userId, {
        conversationId,
        message: "Follow up",
        requestedTools: [],
      }),
    ).rejects.toThrow("conversation_not_found");
  });

  it("lists owner conversations with a transaction and consent gate", async () => {
    const { client, query } = clientWithResponses([]);
    const connect = vi.fn(async () => client);
    pool.mockReturnValue({ connect } as never);
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ personalLearning: true }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: conversationId,
            title: "Owned",
            status: "active",
            consentScope: "personal_memory",
            lastMessageAt: null,
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const result = await listCutisAiConversations(userId);
    expect(result[0]?.id).toBe(conversationId);
    expect(query.mock.calls.some(([text]) => String(text).includes("where user_id = $1::uuid"))).toBe(true);
  });

  it("loads only owner conversations and messages after consent", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ rows: [] }] },
    ]);
    const connect = vi.fn(async () => client);
    pool.mockReturnValue({ connect } as never);
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ personalLearning: true }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: conversationId,
            title: "Owned",
            status: "active",
            consentScope: "personal_memory",
            lastMessageAt: null,
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getCutisAiConversation(userId, conversationId);
    expect(result.conversation.id).toBe(conversationId);
    expect(result.messages).toEqual([]);
    expect(query.mock.calls.some(([text]) => String(text).includes("conversation_id = $1::uuid and user_id = $2::uuid"))).toBe(true);
  });
});
