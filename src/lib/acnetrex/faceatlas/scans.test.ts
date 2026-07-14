import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  getPool: vi.fn(),
}));

import { getPool } from "@/db";
import {
  FaceAtlasConsentRequiredError,
  FaceAtlasScanNotFoundError,
  createFaceAtlasAnnotation,
  createFaceAtlasScan,
  getFaceAtlasScan,
  listFaceAtlasScans,
} from "./scans";

const pool = vi.mocked(getPool);
const userId = "00000000-0000-0000-0000-000000000001";
const scanId = "11111111-1111-4111-8111-111111111111";
const annotationId = "22222222-2222-4222-8222-222222222222";

function clientWithResponses(responses: Array<{ rows?: unknown[]; rowCount?: number }>) {
  const query = vi.fn(async (..._args: unknown[]) => responses.shift() ?? { rows: [] });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  return { client, query };
}

describe("FaceAtlas durable metadata service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires stored raw-image consent before allowing retention", async () => {
    const { client } = clientWithResponses([{ rows: [{ rawImageRetention: false }] }]);
    await expect(
      createFaceAtlasScan(client, userId, {
        angle: "front",
        analysisConsent: true,
        rawImageRetention: true,
        notes: undefined,
      }),
    ).rejects.toBeInstanceOf(FaceAtlasConsentRequiredError);
  });

  it("creates an owner-scoped scan and audits metadata without raw content", async () => {
    const { client, query } = clientWithResponses([
      {
        rows: [
          {
            id: scanId,
            angle: "front",
            status: "pending_upload",
            capturedAt: "2026-07-13T00:00:00.000Z",
            storagePath: null,
            rawImageDeletedAt: null,
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      },
      { rows: [] },
    ]);

    const result = await createFaceAtlasScan(client, userId, {
      angle: "front",
      analysisConsent: true,
      rawImageRetention: false,
      notes: "Morning capture",
    });

    expect(result.scan.id).toBe(scanId);
    expect(result.status).toBe("pending_upload");
    expect(JSON.stringify(query.mock.calls)).toContain("user_id");
    expect(JSON.stringify(query.mock.calls.at(-1))).not.toContain("Morning capture");
  });

  it("rejects annotation writes for scans outside the authenticated owner", async () => {
    const { client } = clientWithResponses([
      { rows: [] },
    ]);
    await expect(
      createFaceAtlasAnnotation(client, userId, {
        scanId,
        lesionType: "papule",
        zone: "left_cheek",
        x: 0.25,
        y: 0.3,
        userCertainty: 0.8,
        source: "user",
      }),
    ).rejects.toBeInstanceOf(FaceAtlasScanNotFoundError);
  });

  it("returns only owner-scoped scan details and annotations", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ id: scanId, angle: "front", status: "pending_upload", capturedAt: "2026-07-13T00:00:00.000Z", storagePath: null, rawImageDeletedAt: null, createdAt: "2026-07-13T00:00:00.000Z", updatedAt: "2026-07-13T00:00:00.000Z" }] },
      { rows: [{ id: annotationId, scanId, lesionType: "papule", zone: "left_cheek", x: 0.2, y: 0.3, w: null, h: null, userCertainty: 0.8, source: "user", notes: null, createdAt: "2026-07-13T00:00:00.000Z" }] },
    ]);
    const result = await getFaceAtlasScan(userId, scanId, client);
    expect(result.scan.id).toBe(scanId);
    expect(result.annotations[0]?.zone).toBe("left_cheek");
    expect(query.mock.calls.every(([sql]) => String(sql).includes("user_id"))).toBe(true);
  });

  it("lists scans through an owner-scoped query", async () => {
    const { client, query } = clientWithResponses([{ rows: [] }]);
    pool.mockReturnValue({ query } as never);
    expect(await listFaceAtlasScans(userId)).toEqual([]);
    expect(query.mock.calls[0]?.[0]).toContain("where user_id = $1::uuid");
  });
});
