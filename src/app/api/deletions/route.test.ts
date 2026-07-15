import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/lib/acnetrex/deletion-requests", async () => {
  const { z } = await import("zod");
  return {
    deletionRequestInputSchema: z.object({
      requestType: z.enum(["record", "face_images", "all_health_data", "account"]),
      target: z.object({ table: z.enum(["sleep_logs"]), id: z.string().uuid() }).strict().optional(),
      exportRequestedFirst: z.boolean(),
      confirmed: z.literal(true),
    }).strict().superRefine((value, context) => {
      if (value.requestType === "record" && !value.target) {
        context.addIssue({ code: "custom", message: "target required", path: ["target"] });
      }
      if (value.requestType !== "record" && value.target) {
        context.addIssue({ code: "custom", message: "target forbidden", path: ["target"] });
      }
    }),
    createDeletionRequest: vi.fn(),
  };
});
vi.mock("@/db", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));

import { POST } from "./route";
import { createDeletionRequest } from "@/lib/acnetrex/deletion-requests";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const createRequest = vi.mocked(createDeletionRequest);
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";

function request(body: unknown, idempotencyKey = "deletion-create-0001") {
  return new Request("https://example.test/api/deletions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/deletions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId: ACTOR_ID });
  });

  it("requires verified authentication before parsing a destructive command", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });

    const response = await POST(request({ requestType: "account", exportRequestedFirst: false, confirmed: true }));

    expect(response.status).toBe(401);
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied user id and missing idempotency key", async () => {
    const withUser = await POST(request({
      requestType: "account",
      userId: "99999999-9999-4999-8999-999999999999",
      exportRequestedFirst: false,
      confirmed: true,
    }));
    const withoutKey = await POST(request({
      requestType: "account",
      exportRequestedFirst: false,
      confirmed: true,
    }, ""));

    expect(withUser.status).toBe(400);
    expect(withoutKey.status).toBe(400);
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("creates the durable request from the token-derived owner", async () => {
    createRequest.mockResolvedValue({
      request: {
        id: REQUEST_ID,
        requestType: "account",
        status: "scheduled",
        exportRequestedFirst: true,
        currentStep: "awaiting_grace_period",
        attemptCount: 0,
        maxAttempts: 10,
        lastErrorCode: null,
        requestedAt: "2026-07-14T00:00:00.000Z",
        gracePeriodEndsAt: "2026-07-28T00:00:00.000Z",
        scheduledPurgeAt: "2026-07-28T00:00:00.000Z",
        cancelledAt: null,
        completedAt: null,
      },
      replayed: false,
    });

    const response = await POST(request({
      requestType: "account",
      exportRequestedFirst: true,
      confirmed: true,
    }));

    expect(response.status).toBe(201);
    expect(response.headers.get("location")).toBe(`/api/deletions/${REQUEST_ID}`);
    expect(createRequest).toHaveBeenCalledWith({
      actorId: ACTOR_ID,
      idempotencyKey: "deletion-create-0001",
      input: { requestType: "account", exportRequestedFirst: true, confirmed: true },
    });
  });
});
