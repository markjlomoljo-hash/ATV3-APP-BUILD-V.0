import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  getPool: vi.fn(),
}));

import { FaceAtlasScanNotFoundError } from "./scans";
import {
  FACE_SCANS_RAW_BUCKET,
  FaceAtlasScanStateError,
  FaceAtlasUploadConsentError,
  FaceScanStorageError,
  authorizeFaceScanUpload,
  buildFaceScanStoragePath,
  faceAtlasFinalizeRequestSchema,
  finalizeFaceScanUpload,
  getSupabaseFaceScanObjectStore,
  toEngineAngle,
} from "./upload";

const userId = "00000000-0000-0000-0000-000000000001";
const scanId = "11111111-1111-4111-8111-111111111111";
const jobId = "33333333-3333-4333-8333-333333333333";

function clientWithResponses(responses: Array<{ rows?: unknown[]; rowCount?: number }>) {
  const query = vi.fn(async (..._args: unknown[]) => responses.shift() ?? { rows: [] });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  return { client, query };
}

function scanRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: scanId,
    angle: "front",
    status: "pending_upload",
    capturedAt: "2026-07-13T00:00:00.000Z",
    storagePath: null,
    rawImageDeletedAt: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("FaceAtlas storage path contract", () => {
  it("builds the owner-scoped path shared with the mobile client", () => {
    expect(buildFaceScanStoragePath(userId, scanId, "front")).toBe(`${userId}/${scanId}/front.jpg`);
    expect(buildFaceScanStoragePath(userId, scanId, "chin_up")).toBe(`${userId}/${scanId}/chin_up.jpg`);
  });

  it("bridges every API angle onto the deterministic engine vocabulary", () => {
    expect(toEngineAngle("front")).toBe("front");
    expect(toEngineAngle("left")).toBe("left_45");
    expect(toEngineAngle("right")).toBe("right_45");
    expect(toEngineAngle("forehead")).toBe("forehead_upper");
    expect(toEngineAngle("chin_up")).toBe("chin_lower");
  });
});

describe("authorizeFaceScanUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects scans outside the authenticated owner", async () => {
    const { client } = clientWithResponses([{ rows: [] }]);
    await expect(authorizeFaceScanUpload(client, userId, scanId)).rejects.toBeInstanceOf(
      FaceAtlasScanNotFoundError,
    );
  });

  it("refuses scans that are not awaiting an upload", async () => {
    const { client, query } = clientWithResponses([
      { rows: [scanRow({ status: "queued_for_cloud" })] },
    ]);
    const error = await authorizeFaceScanUpload(client, userId, scanId).catch((thrown) => thrown);
    expect(error).toBeInstanceOf(FaceAtlasScanStateError);
    expect((error as FaceAtlasScanStateError).reason).toBe("scan_not_awaiting_upload");
    expect((error as FaceAtlasScanStateError).currentStatus).toBe("queued_for_cloud");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("fails closed with the exact missing consents before touching storage state", async () => {
    const { client, query } = clientWithResponses([
      { rows: [scanRow()] },
      { rows: [{ rawImageLearning: false }] },
      { rows: [] },
    ]);
    const error = await authorizeFaceScanUpload(client, userId, scanId).catch((thrown) => thrown);
    expect(error).toBeInstanceOf(FaceAtlasUploadConsentError);
    expect((error as FaceAtlasUploadConsentError).missing).toEqual([
      "consent_settings.raw_image_learning",
      "consents.raw_image_retention",
    ]);
    expect(JSON.stringify(query.mock.calls)).not.toContain("update public.face_scans");
  });

  it("issues the canonical path and advances pending_upload to uploading", async () => {
    const { client, query } = clientWithResponses([
      { rows: [scanRow()] },
      { rows: [{ rawImageLearning: true }] },
      { rows: [{ rawImageRetention: true }] },
      { rows: [scanRow({ status: "uploading", storagePath: `${userId}/${scanId}/front.jpg` })] },
      { rows: [] },
    ]);
    const result = await authorizeFaceScanUpload(client, userId, scanId);
    expect(result.upload).toEqual({
      bucket: FACE_SCANS_RAW_BUCKET,
      path: `${userId}/${scanId}/front.jpg`,
      contentType: "image/jpeg",
      method: "user_token_upload",
    });
    expect(result.scan.status).toBe("uploading");
    const updateCall = query.mock.calls.find(([sql]) => String(sql).includes("update public.face_scans"));
    expect(updateCall?.[0]).toContain("status = 'uploading'");
    expect(updateCall?.[1]).toContain(`${userId}/${scanId}/front.jpg`);
    const auditCall = query.mock.calls.at(-1);
    expect(String(auditCall?.[0])).toContain("audit_logs");
    expect(String(auditCall?.[0])).toContain("faceatlas_upload_authorized");
  });
});

describe("finalizeFaceScanUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects scans outside the authenticated owner", async () => {
    const { client } = clientWithResponses([{ rows: [] }]);
    await expect(
      finalizeFaceScanUpload(client, userId, scanId, { width: 1280, height: 960 }, { sizeBytes: 1000 }),
    ).rejects.toBeInstanceOf(FaceAtlasScanNotFoundError);
  });

  it("returns the already-finalized scan without queuing a duplicate job", async () => {
    const { client, query } = clientWithResponses([
      { rows: [scanRow({ status: "queued_for_cloud", storagePath: `${userId}/${scanId}/front.jpg` })] },
    ]);
    const result = await finalizeFaceScanUpload(
      client,
      userId,
      scanId,
      { width: 1280, height: 960 },
      { sizeBytes: 1000 },
    );
    expect(result.outcome).toBe("already_finalized");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("refuses finalization when no upload was authorized", async () => {
    const { client } = clientWithResponses([{ rows: [scanRow({ status: "pending_upload" })] }]);
    const error = await finalizeFaceScanUpload(
      client,
      userId,
      scanId,
      { width: 1280, height: 960 },
      { sizeBytes: 1000 },
    ).catch((thrown) => thrown);
    expect(error).toBeInstanceOf(FaceAtlasScanStateError);
    expect((error as FaceAtlasScanStateError).reason).toBe("upload_not_authorized");
  });

  it("records honest engine issues, queues a durable capture_quality job, and advances the status atomically", async () => {
    const uploading = scanRow({
      angle: "left",
      status: "uploading",
      storagePath: `${userId}/${scanId}/left.jpg`,
    });
    const { client, query } = clientWithResponses([
      { rows: [uploading] },
      { rows: [{ id: jobId }] },
      { rows: [] },
      { rows: [scanRow({ angle: "left", status: "queued_for_cloud", storagePath: `${userId}/${scanId}/left.jpg` })] },
      { rows: [] },
    ]);
    const result = await finalizeFaceScanUpload(
      client,
      userId,
      scanId,
      { width: 320, height: 240 },
      { sizeBytes: 1234 },
    );
    if (result.outcome !== "finalized") throw new Error("expected finalized outcome");
    expect(result.jobId).toBe(jobId);
    expect(result.quality.issueCodes).toEqual(["resolution_low"]);
    expect(result.quality.verifiedBytes).toBe(1234);
    expect(result.quality.limitations.join(" ")).toContain("client-reported");

    const jobCall = query.mock.calls.find(([sql]) => String(sql).includes("ml_analysis_jobs"));
    expect(String(jobCall?.[0])).toContain("'faceatlas', 'capture_quality'");
    const jobParams = jobCall?.[1] as unknown[] | undefined;
    const features = JSON.parse(String(jobParams?.[2])) as { images: Array<Record<string, unknown>> };
    expect(features.images[0]).toMatchObject({ angle: "left_45", width: 320, height: 240, bytes: 1234 });

    const outboxCall = query.mock.calls.find(([sql]) => String(sql).includes("outbox_events"));
    expect(String(outboxCall?.[0])).toContain("'ml.analysis.requested'");
    expect(JSON.stringify(outboxCall?.[1])).toContain("capture_quality");
    expect(JSON.stringify(outboxCall?.[1])).toContain(`faceatlas-finalize:${userId}:${scanId}`);

    const updateCall = query.mock.calls.find(([sql]) => String(sql).includes("update public.face_scans"));
    expect(String(updateCall?.[0])).toContain("status = 'queued_for_cloud'");
    expect(String(updateCall?.[0])).not.toContain("image_quality");
    const noteParam = String((updateCall?.[1] as unknown[] | undefined)?.[2]);
    expect(noteParam).toContain("server_upload_verified_bytes=1234");
    expect(noteParam).toContain("server_quality_issues=resolution_low");

    const auditCall = query.mock.calls.at(-1);
    expect(String(auditCall?.[0])).toContain("faceatlas_scan_finalized");
    expect(JSON.stringify(auditCall?.[1])).toContain("resolution_low");
  });

  it("flags oversized stored objects from the verified byte size", async () => {
    const uploading = scanRow({ status: "uploading", storagePath: `${userId}/${scanId}/front.jpg` });
    const { client } = clientWithResponses([
      { rows: [uploading] },
      { rows: [{ id: jobId }] },
      { rows: [] },
      { rows: [scanRow({ status: "queued_for_cloud" })] },
      { rows: [] },
    ]);
    const result = await finalizeFaceScanUpload(
      client,
      userId,
      scanId,
      { width: 1280, height: 960 },
      { sizeBytes: 5 * 1024 * 1024 },
    );
    if (result.outcome !== "finalized") throw new Error("expected finalized outcome");
    expect(result.quality.issueCodes).toContain("file_size_invalid");
  });

  it("records an explicit no-issue result instead of inventing a score", async () => {
    const uploading = scanRow({ status: "uploading", storagePath: `${userId}/${scanId}/front.jpg` });
    const { client, query } = clientWithResponses([
      { rows: [uploading] },
      { rows: [{ id: jobId }] },
      { rows: [] },
      { rows: [scanRow({ status: "queued_for_cloud" })] },
      { rows: [] },
    ]);
    const result = await finalizeFaceScanUpload(
      client,
      userId,
      scanId,
      { width: 1280, height: 960 },
      { sizeBytes: 200_000 },
    );
    if (result.outcome !== "finalized") throw new Error("expected finalized outcome");
    expect(result.quality.issueCodes).toEqual([]);
    const updateCall = query.mock.calls.find(([sql]) => String(sql).includes("update public.face_scans"));
    expect(String((updateCall?.[1] as unknown[] | undefined)?.[2])).toContain("server_quality_issues=none");
    expect(JSON.stringify(result)).not.toContain("confidence");
  });
});

describe("finalize request schema", () => {
  it("requires real positive integer dimensions", () => {
    expect(faceAtlasFinalizeRequestSchema.safeParse({ width: 1280, height: 960 }).success).toBe(true);
    expect(faceAtlasFinalizeRequestSchema.safeParse({ width: 0, height: 960 }).success).toBe(false);
    expect(faceAtlasFinalizeRequestSchema.safeParse({ width: 12.5, height: 960 }).success).toBe(false);
    expect(faceAtlasFinalizeRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("getSupabaseFaceScanObjectStore", () => {
  it("fails closed when the service-role storage configuration is absent", async () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const error = await getSupabaseFaceScanObjectStore().catch((thrown) => thrown);
      expect(error).toBeInstanceOf(FaceScanStorageError);
      expect((error as FaceScanStorageError).reason).toBe("storage_not_configured");
    } finally {
      if (previousUrl !== undefined) process.env.SUPABASE_URL = previousUrl;
      if (previousKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    }
  });
});
