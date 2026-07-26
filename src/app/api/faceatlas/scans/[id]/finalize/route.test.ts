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
  getFaceAtlasScan: vi.fn(),
}));
vi.mock("@/lib/acnetrex/faceatlas/upload", () => ({
  FaceAtlasScanStateError: class FaceAtlasScanStateError extends Error {
    reason: string;
    currentStatus: string;
    constructor(reason = "upload_not_authorized", currentStatus = "pending_upload") {
      super(reason);
      this.reason = reason;
      this.currentStatus = currentStatus;
    }
  },
  FaceScanStorageError: class FaceScanStorageError extends Error {
    reason: string;
    constructor(reason: string) {
      super(reason);
      this.reason = reason;
    }
  },
  faceAtlasFinalizeRequestSchema: {
    safeParse: (value: unknown) => {
      const candidate = value as { width?: unknown; height?: unknown } | null;
      if (candidate && typeof candidate.width === "number" && typeof candidate.height === "number") {
        return { success: true as const, data: candidate };
      }
      return { success: false as const, error: { issues: [{ message: "invalid_dimensions" }] } };
    },
  },
  finalizeFaceScanUpload: vi.fn(),
  getSupabaseFaceScanObjectStore: vi.fn(),
}));
vi.mock("@/lib/reliability/idempotency", () => ({ executeIdempotent: vi.fn() }));

import { getDb } from "@/db";
import { POST } from "./route";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { getFaceAtlasScan } from "@/lib/acnetrex/faceatlas/scans";
import {
  FaceScanStorageError,
  finalizeFaceScanUpload,
  getSupabaseFaceScanObjectStore,
} from "@/lib/acnetrex/faceatlas/upload";
import { executeIdempotent } from "@/lib/reliability/idempotency";

const auth = vi.mocked(authenticateSupabaseRequest);
const database = vi.mocked(getDb);
const getScan = vi.mocked(getFaceAtlasScan);
const finalize = vi.mocked(finalizeFaceScanUpload);
const objectStore = vi.mocked(getSupabaseFaceScanObjectStore);
const idempotent = vi.mocked(executeIdempotent);
const userId = "00000000-0000-0000-0000-000000000001";
const scanId = "11111111-1111-4111-8111-111111111111";
const jobId = "33333333-3333-4333-8333-333333333333";

function scan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: scanId,
    angle: "front",
    status: "uploading",
    capturedAt: "2026-07-13T00:00:00.000Z",
    storagePath: `${userId}/${scanId}/front.jpg`,
    rawImageDeletedAt: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://example.test/api/faceatlas/scans/${scanId}/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
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

describe("FaceAtlas finalize route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, userId });
    database.mockReturnValue({} as ReturnType<typeof getDb>);
  });

  it("requires authentication before finalizing", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await POST(
      request({ width: 1280, height: 960 }, { "idempotency-key": "faceatlas-finalize-key-01" }),
      params(),
    );
    expect(response.status).toBe(401);
    expect(getScan).not.toHaveBeenCalled();
  });

  it("requires an idempotency key", async () => {
    const response = await POST(request({ width: 1280, height: 960 }), params());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("rejects payloads without real measured dimensions", async () => {
    const response = await POST(
      request({ width: "big" }, { "idempotency-key": "faceatlas-finalize-key-02" }),
      params(),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "invalid_faceatlas_finalize_payload" });
    expect(objectStore).not.toHaveBeenCalled();
  });

  it("returns the honest already-finalized state without re-verifying storage", async () => {
    getScan.mockResolvedValue({ scan: scan({ status: "queued_for_cloud" }), annotations: [] } as never);
    const response = await POST(
      request({ width: 1280, height: 960 }, { "idempotency-key": "faceatlas-finalize-key-03" }),
      params(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, status: "queued_for_cloud", alreadyFinalized: true });
    expect(objectStore).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
  });

  it("returns 409 when no upload was authorized for the scan", async () => {
    getScan.mockResolvedValue({ scan: scan({ status: "pending_upload", storagePath: null }), annotations: [] } as never);
    const response = await POST(
      request({ width: 1280, height: 960 }, { "idempotency-key": "faceatlas-finalize-key-04" }),
      params(),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: "upload_not_authorized" });
  });

  it("fails closed when the raw object never arrived in the bucket", async () => {
    getScan.mockResolvedValue({ scan: scan(), annotations: [] } as never);
    objectStore.mockResolvedValue({ getObjectInfo: vi.fn().mockResolvedValue(null) });
    const response = await POST(
      request({ width: 1280, height: 960 }, { "idempotency-key": "faceatlas-finalize-key-05" }),
      params(),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "raw_object_missing",
      details: { status: "uploading" },
    });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("reports storage_not_configured instead of pretending verification happened", async () => {
    getScan.mockResolvedValue({ scan: scan(), annotations: [] } as never);
    objectStore.mockRejectedValue(new FaceScanStorageError("storage_not_configured"));
    const response = await POST(
      request({ width: 1280, height: 960 }, { "idempotency-key": "faceatlas-finalize-key-06" }),
      params(),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "storage_not_configured" });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("finalizes a verified upload into queued_for_cloud with the real job reference", async () => {
    getScan.mockResolvedValue({ scan: scan(), annotations: [] } as never);
    objectStore.mockResolvedValue({
      getObjectInfo: vi.fn().mockResolvedValue({ sizeBytes: 204_800, contentType: "image/jpeg" }),
    });
    passthroughIdempotency();
    finalize.mockResolvedValue({
      outcome: "finalized",
      scan: scan({ status: "queued_for_cloud" }),
      quality: {
        engine: "deterministic_capture_quality",
        scope: "single_angle",
        verifiedBytes: 204_800,
        clientReportedDimensions: { width: 1280, height: 960 },
        issueCodes: [],
        limitations: ["Local quality checks assess capture metadata only; they do not detect or classify lesions."],
      },
      jobId,
    } as Awaited<ReturnType<typeof finalizeFaceScanUpload>>);
    const response = await POST(
      request({ width: 1280, height: 960 }, { "idempotency-key": "faceatlas-finalize-key-07" }),
      params(),
    );
    expect(response.status).toBe(202);
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      status: "queued_for_cloud",
      analysis: { status: "queued_for_cloud", jobId },
      quality: { issueCodes: [], verifiedBytes: 204_800 },
    });
    expect(JSON.stringify(payload)).not.toContain("lesionCounts");
    expect(finalize).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      scanId,
      { width: 1280, height: 960 },
      { sizeBytes: 204_800 },
    );
    expect(idempotent).toHaveBeenCalledWith(expect.objectContaining({ scope: "faceatlas-finalize" }));
  });
});
