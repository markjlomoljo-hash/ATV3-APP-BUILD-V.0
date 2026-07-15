import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/lib/acnetrex/deletion-requests", () => ({
  getDeletionRequest: vi.fn(),
  cancelDeletionRequest: vi.fn(),
}));
vi.mock("@/db", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));

import { DELETE, GET } from "./route";
import { cancelDeletionRequest, getDeletionRequest } from "@/lib/acnetrex/deletion-requests";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const getRequest = vi.mocked(getDeletionRequest);
const cancelRequest = vi.mocked(cancelDeletionRequest);
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ id: REQUEST_ID }) };

describe("/api/deletions/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId: ACTOR_ID });
  });

  it("returns 404 rather than revealing another owner's request", async () => {
    getRequest.mockResolvedValue(null);

    const response = await GET(new Request(`https://example.test/api/deletions/${REQUEST_ID}`), context);

    expect(response.status).toBe(404);
    expect(getRequest).toHaveBeenCalledWith({ actorId: ACTOR_ID, requestId: REQUEST_ID });
  });

  it("validates identifiers before a status lookup", async () => {
    const response = await GET(new Request("https://example.test/api/deletions/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });

    expect(response.status).toBe(400);
    expect(getRequest).not.toHaveBeenCalled();
  });

  it("cancels through an idempotent token-derived owner command", async () => {
    cancelRequest.mockResolvedValue({ requestId: REQUEST_ID, status: "cancelled", replayed: false });
    const request = new Request(`https://example.test/api/deletions/${REQUEST_ID}`, {
      method: "DELETE",
      headers: { "idempotency-key": "deletion-cancel-0001" },
    });

    const response = await DELETE(request, context);

    expect(response.status).toBe(200);
    expect(cancelRequest).toHaveBeenCalledWith({
      actorId: ACTOR_ID,
      requestId: REQUEST_ID,
      idempotencyKey: "deletion-cancel-0001",
    });
  });
});
