import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({
  authenticateSupabaseRequest: vi.fn(),
}));
vi.mock("@/lib/acnetrex/memory/conversations", () => ({
  CutisAiConsentRequiredError: class CutisAiConsentRequiredError extends Error {},
  listCutisAiConversations: vi.fn(),
  recordCutisAiMessage: vi.fn(),
}));
vi.mock("@/lib/reliability/idempotency", () => ({
  executeIdempotent: vi.fn(),
}));
vi.mock("@/db", () => ({
  getDb: vi.fn(),
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));

import { GET, POST } from "./route";
import { DatabaseConfigurationError, getDb } from "@/db";
import {
  CutisAiConsentRequiredError,
  listCutisAiConversations,
  recordCutisAiMessage,
} from "@/lib/acnetrex/memory/conversations";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const list = vi.mocked(listCutisAiConversations);
const record = vi.mocked(recordCutisAiMessage);
const idempotent = vi.mocked(executeIdempotent);

const userId = "00000000-0000-0000-0000-000000000001";
const conversationId = "11111111-1111-4111-8111-111111111111";
const messageId = "22222222-2222-4222-8222-222222222222";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/cutisai/conversations", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("CutisAI conversation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires authenticated access before listing conversations", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await GET(new Request("https://example.test/api/cutisai/conversations"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_required" });
    expect(list).not.toHaveBeenCalled();
  });

  it("returns owner-scoped conversation summaries", async () => {
    list.mockResolvedValue([]);
    const response = await GET(new Request("https://example.test/api/cutisai/conversations"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, conversations: [] });
  });

  it("surfaces consent_required without querying conversation data", async () => {
    list.mockRejectedValue(new CutisAiConsentRequiredError());
    const response = await GET(new Request("https://example.test/api/cutisai/conversations"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "consent_required" });
  });

  it("requires an idempotency key before accepting a message", async () => {
    const response = await POST(request({ message: "What should I log today?" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
    expect(idempotent).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and payloads before database access", async () => {
    const malformed = new Request("https://example.test/api/cutisai/conversations", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "cutisai-message-key-03" },
      body: "{",
    });
    const malformedResponse = await POST(malformed);
    expect(malformedResponse.status).toBe(400);
    expect(await malformedResponse.json()).toEqual({ ok: false, error: "invalid_json_body" });

    const invalidResponse = await POST(
      request({ message: "" }, { "idempotency-key": "cutisai-message-key-04" }),
    );
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toMatchObject({ ok: false, error: "invalid_message_payload" });
  });

  it("reports configuration failure before acknowledging a write", async () => {
    database.mockImplementation(() => {
      throw new DatabaseConfigurationError();
    });
    const response = await POST(
      request({ message: "Save this question" }, { "idempotency-key": "cutisai-message-key-05" }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_unavailable" });
  });

  it("persists only a validated user message and returns an honest assistant state", async () => {
    record.mockResolvedValue({
      conversation: {
        id: conversationId,
        title: "What should I log today?",
        status: "active",
        consentScope: "personal_memory",
        lastMessageAt: "2026-07-13T00:00:00.000Z",
        createdAt: "2026-07-13T00:00:00.000Z",
        updatedAt: "2026-07-13T00:00:00.000Z",
      },
      message: {
        id: messageId,
        conversationId,
        role: "user",
        content: "What should I log today?",
        requestedTools: [],
        runtimeMode: null,
        modelName: null,
        modelVersion: null,
        evidenceRefs: [],
        createdAt: "2026-07-13T00:00:00.000Z",
      },
    });
    idempotent.mockImplementation(async (options) => {
      const result = await options.execute({} as never);
      return { ...result, replayed: false };
    });

    const response = await POST(
      request(
        { message: "What should I log today?", requestedTools: [] },
        { "idempotency-key": "cutisai-message-key-01" },
      ),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      conversation: { id: conversationId },
      message: { role: "user" },
      assistant: { status: "not_configured", evidence: "evidence_unavailable" },
      replayed: false,
    });
    expect(record).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({ message: "What should I log today?" }),
    );
  });

  it("returns database_unavailable rather than acknowledging a write", async () => {
    database.mockImplementation(() => {
      throw new Error("database unavailable");
    });
    const response = await POST(
      request({ message: "Save this question" }, { "idempotency-key": "cutisai-message-key-02" }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_query_failed" });
    expect(idempotent).not.toHaveBeenCalled();
  });
});
