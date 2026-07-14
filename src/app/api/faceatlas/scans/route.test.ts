import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({
  getDb: vi.fn(),
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));
vi.mock("@/lib/acnetrex/faceatlas/scans", () => ({
  FaceAtlasConsentRequiredError: class FaceAtlasConsentRequiredError extends Error {},
  faceAtlasScanRequestSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
  createFaceAtlasScan: vi.fn(),
  listFaceAtlasScans: vi.fn(),
}));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));

import { getDb } from "@/db";
import { POST, GET } from "./route";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { createFaceAtlasScan, listFaceAtlasScans } from "@/lib/acnetrex/faceatlas/scans";
import { executeIdempotent } from "@/lib/reliability/idempotency";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const create = vi.mocked(createFaceAtlasScan);
const list = vi.mocked(listFaceAtlasScans);
const idempotent = vi.mocked(executeIdempotent);
const userId = "00000000-0000-0000-0000-000000000001";
const scanId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/faceatlas/scans", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("FaceAtlas scan routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires authentication before reading scans", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await GET(new Request("https://example.test/api/faceatlas/scans"));
    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it("requires an idempotency key before acknowledging a scan write", async () => {
    const response = await POST(request({ angle: "front", analysisConsent: true, rawImageRetention: false }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("rejects consent-disabled raw retention without touching the database", async () => {
    create.mockRejectedValue(new Error("raw_image_retention_consent_required"));
    idempotent.mockImplementation(async (options) => {
      await expect(options.execute({} as never)).rejects.toThrow("raw_image_retention_consent_required");
      throw new Error("raw_image_retention_consent_required");
    });
    const response = await POST(
      request({ angle: "front", analysisConsent: true, rawImageRetention: true }, { "idempotency-key": "faceatlas-scan-key-01" }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "consent_required" });
  });

  it("returns a queued-for-cloud reference and never invents scan analysis", async () => {
    create.mockResolvedValue({
      scan: { id: scanId, angle: "front", status: "pending_upload", capturedAt: "2026-07-13T00:00:00.000Z", storagePath: null, rawImageDeletedAt: null, createdAt: "2026-07-13T00:00:00.000Z", updatedAt: "2026-07-13T00:00:00.000Z" },
      status: "pending_upload",
    });
    idempotent.mockImplementation(async (options) => {
      const result = await options.execute({} as never);
      return { ...result, replayed: false };
    });
    const response = await POST(
      request({ angle: "front", analysisConsent: true, rawImageRetention: false }, { "idempotency-key": "faceatlas-scan-key-02" }),
    );
    expect(response.status).toBe(202);
    const payload = await response.json();
    expect(payload).toMatchObject({ ok: true, status: "pending_upload", scan: { id: scanId } });
    expect(JSON.stringify(payload)).not.toContain("lesionCounts");
  });
});
