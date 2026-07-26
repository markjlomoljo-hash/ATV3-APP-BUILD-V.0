import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-request-auth", () => ({ authenticateSupabaseRequest: vi.fn() }));
vi.mock("@/db", () => ({
  getDb: vi.fn(),
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
}));
vi.mock("@/lib/acnetrex/faceatlas/scans", () => ({
  FaceAtlasScanNotFoundError: class FaceAtlasScanNotFoundError extends Error {
    constructor() {
      super("faceatlas_scan_not_found");
    }
  },
}));
vi.mock("@/lib/acnetrex/faceatlas/upload", () => ({
  FaceAtlasScanStateError: class FaceAtlasScanStateError extends Error {
    reason: string;
    currentStatus: string;
    constructor(reason = "scan_not_awaiting_upload", currentStatus = "queued_for_cloud") {
      super(reason);
      this.reason = reason;
      this.currentStatus = currentStatus;
    }
  },
  FaceAtlasUploadConsentError: class FaceAtlasUploadConsentError extends Error {
    missing: string[];
    constructor(missing: string[] = []) {
      super("raw_image_consent_required");
      this.missing = missing;
    }
  },
  authorizeFaceScanUpload: vi.fn(),
}));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));

import { getDb } from "@/db";
import { POST } from "./route";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { FaceAtlasScanNotFoundError } from "@/lib/acnetrex/faceatlas/scans";
import {
  FaceAtlasScanStateError,
  FaceAtlasUploadConsentError,
  authorizeFaceScanUpload,
} from "@/lib/acnetrex/faceatlas/upload";
import { executeIdempotent } from "@/lib/reliability/idempotency";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const authorize = vi.mocked(authorizeFaceScanUpload);
const idempotent = vi.mocked(executeIdempotent);
const userId = "00000000-0000-0000-0000-000000000001";
const scanId = "11111111-1111-4111-8111-111111111111";

function request(headers: Record<string, string> = {}) {
  return new Request(`https://example.test/api/faceatlas/scans/${scanId}/upload`, {
    method: "POST",
    headers,
  });
}

function params(id: string = scanId) {
  return { params: Promise.resolve({ id }) };
}

function passthroughIdempotency() {
  idempotent.mockImplementation(async (options) => {
    const result = await options.execute({} as never);
    return { ...result, replayed: false };
  });
}

describe("FaceAtlas upload authorization route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires authentication before authorizing an upload", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await POST(request({ "idempotency-key": "faceatlas-upload-key-01" }), params());
    expect(response.status).toBe(401);
    expect(authorize).not.toHaveBeenCalled();
  });

  it("rejects malformed scan ids", async () => {
    const response = await POST(request({ "idempotency-key": "faceatlas-upload-key-01" }), params("not-a-uuid"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_scan_id" });
  });

  it("requires an idempotency key before any state change", async () => {
    const response = await POST(request(), params());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
    expect(idempotent).not.toHaveBeenCalled();
  });

  it("refuses honestly when the raw-image consents are not recorded", async () => {
    passthroughIdempotency();
    authorize.mockRejectedValue(
      new FaceAtlasUploadConsentError(["consents.raw_image_retention"]),
    );
    const response = await POST(request({ "idempotency-key": "faceatlas-upload-key-02" }), params());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "consent_required",
      details: { missing: ["consents.raw_image_retention"] },
    });
  });

  it("returns 409 for scans that are not awaiting an upload", async () => {
    passthroughIdempotency();
    authorize.mockRejectedValue(new FaceAtlasScanStateError("scan_not_awaiting_upload", "queued_for_cloud"));
    const response = await POST(request({ "idempotency-key": "faceatlas-upload-key-03" }), params());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: "scan_not_awaiting_upload" });
  });

  it("returns 404 for scans outside the authenticated owner", async () => {
    passthroughIdempotency();
    authorize.mockRejectedValue(new FaceAtlasScanNotFoundError());
    const response = await POST(request({ "idempotency-key": "faceatlas-upload-key-04" }), params());
    expect(response.status).toBe(404);
  });

  it("issues the owner-scoped user-token upload path without inventing analysis", async () => {
    passthroughIdempotency();
    authorize.mockResolvedValue({
      scan: { id: scanId, angle: "front", status: "uploading", capturedAt: "2026-07-13T00:00:00.000Z", storagePath: `${userId}/${scanId}/front.jpg`, rawImageDeletedAt: null, createdAt: "2026-07-13T00:00:00.000Z", updatedAt: "2026-07-13T00:00:00.000Z" },
      upload: {
        bucket: "face-scans-raw",
        path: `${userId}/${scanId}/front.jpg`,
        contentType: "image/jpeg",
        method: "user_token_upload",
      },
    } as Awaited<ReturnType<typeof authorizeFaceScanUpload>>);
    const response = await POST(request({ "idempotency-key": "faceatlas-upload-key-05" }), params());
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      status: "uploading",
      upload: { path: `${userId}/${scanId}/front.jpg`, method: "user_token_upload" },
    });
    expect(JSON.stringify(payload)).not.toContain("lesionCounts");
    expect(idempotent).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "faceatlas-upload-authorization", actorId: userId }),
    );
  });
});
