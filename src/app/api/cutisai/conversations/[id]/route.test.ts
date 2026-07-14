import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({
  authenticateSupabaseRequest: vi.fn(),
}));
vi.mock("@/lib/acnetrex/memory/conversations", () => ({
  CutisAiConsentRequiredError: class CutisAiConsentRequiredError extends Error {},
  CutisAiConversationNotFoundError: class CutisAiConversationNotFoundError extends Error {},
  getCutisAiConversation: vi.fn(),
}));
vi.mock("@/db", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));

import { GET } from "./route";
import {
  CutisAiConversationNotFoundError,
  getCutisAiConversation,
} from "@/lib/acnetrex/memory/conversations";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const getConversation = vi.mocked(getCutisAiConversation);
const userId = "00000000-0000-0000-0000-000000000001";
const conversationId = "11111111-1111-4111-8111-111111111111";

describe("GET /api/cutisai/conversations/:id", () => {
  it("rejects malformed conversation identifiers", async () => {
    auth.mockResolvedValue({ ok: true, userId });
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_conversation_id" });
  });

  it("does not reveal conversations outside the authenticated owner", async () => {
    auth.mockResolvedValue({ ok: true, userId });
    getConversation.mockRejectedValue(new CutisAiConversationNotFoundError());
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: conversationId }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "conversation_not_found" });
  });

  it("returns owner-scoped durable history", async () => {
    auth.mockResolvedValue({ ok: true, userId });
    getConversation.mockResolvedValue({
      conversation: {
        id: conversationId,
        title: "A question",
        status: "active",
        consentScope: "personal_memory",
        lastMessageAt: "2026-07-13T00:00:00.000Z",
        createdAt: "2026-07-13T00:00:00.000Z",
        updatedAt: "2026-07-13T00:00:00.000Z",
      },
      messages: [],
    });
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: conversationId }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, conversation: { id: conversationId }, messages: [] });
    expect(getConversation).toHaveBeenCalledWith(userId, conversationId);
  });
});
