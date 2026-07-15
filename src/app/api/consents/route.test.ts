import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/lib/acnetrex/consents", async () => {
  const { z } = await import("zod");
  return {
    canonicalConsentPatchSchema: z.object({
      personalProcessing: z.boolean().optional(),
      rawImageProcessing: z.boolean().optional(),
      personalLearning: z.boolean().optional(),
      rawImageRetention: z.boolean().optional(),
      anonymousLearning: z.boolean().optional(),
      researchShare: z.boolean().optional(),
      marketing: z.boolean().optional(),
    }).strict().refine((value) => Object.keys(value).length > 0),
    getCanonicalConsent: vi.fn(),
    updateCanonicalConsent: vi.fn(),
  };
});
vi.mock("@/db", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));

import { GET, PATCH } from "./route";
import { getCanonicalConsent, updateCanonicalConsent } from "@/lib/acnetrex/consents";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const getConsent = vi.mocked(getCanonicalConsent);
const updateConsent = vi.mocked(updateCanonicalConsent);

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/consents", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("canonical Supabase consent API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId: "11111111-1111-4111-8111-111111111111" });
  });

  it("reads only the authenticated user's canonical consent", async () => {
    getConsent.mockResolvedValue({
      personalProcessing: false,
      rawImageProcessing: false,
      personalLearning: false,
      rawImageRetention: false,
      anonymousLearning: false,
      researchShare: false,
      marketing: false,
      consentedAt: null,
      updatedAt: null,
    });

    const response = await GET(new Request("https://example.test/api/consents"));

    expect(response.status).toBe(200);
    expect(getConsent).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(await response.json()).toMatchObject({ ok: true, consent: { personalLearning: false } });
  });

  it("requires a stable idempotency key for consent changes", async () => {
    const response = await PATCH(request({ personalLearning: true }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
    expect(updateConsent).not.toHaveBeenCalled();
  });

  it("updates canonical processing consent without treating learning or image retention as processing consent", async () => {
    updateConsent.mockResolvedValue({
      consent: {
        personalProcessing: true,
        rawImageProcessing: false,
        personalLearning: false,
        rawImageRetention: false,
        anonymousLearning: false,
        researchShare: false,
        marketing: false,
        consentedAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
      replayed: false,
    });

    const response = await PATCH(request(
      { personalProcessing: true, rawImageProcessing: false, personalLearning: false, rawImageRetention: false },
      { "idempotency-key": "11111111-1111-4111-8111-111111111111" },
    ));

    expect(response.status).toBe(200);
    expect(updateConsent).toHaveBeenCalledWith({
      actorId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      patch: { personalProcessing: true, rawImageProcessing: false, personalLearning: false, rawImageRetention: false },
    });
    expect(await response.json()).toMatchObject({
      ok: true,
      consent: {
        personalProcessing: true,
        rawImageProcessing: false,
        personalLearning: false,
        rawImageRetention: false,
      },
    });
  });
});
