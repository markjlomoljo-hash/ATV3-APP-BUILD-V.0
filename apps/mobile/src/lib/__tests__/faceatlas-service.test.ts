import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  type Call = { table: string; ops: [string, unknown[]][] };
  const supabaseCalls: Call[] = [];
  let handler: (call: Call) => { data?: unknown; error: { message: string } | null } = () => ({
    data: null,
    error: null,
  });

  function makeBuilder(table: string) {
    const call: Call = { table, ops: [] };
    supabaseCalls.push(call);
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit", "maybeSingle", "single"]) {
      builder[method] = (...args: unknown[]) => {
        call.ops.push([method, args]);
        return builder;
      };
    }
    (builder as { then: unknown }).then = (
      resolve: (value: unknown) => unknown
    ) => resolve(handler(call));
    return builder;
  }

  type StorageUpload = { bucket: string; path: string; bytes: unknown; options: unknown };
  const storageUploads: StorageUpload[] = [];
  let storageHandler: (upload: StorageUpload) => { error: { message: string } | null } = () => ({
    error: null,
  });

  type ApiCall = { method: string; path: string; payload: Record<string, unknown> };
  const apiCalls: ApiCall[] = [];
  let apiHandler: (call: ApiCall) => Promise<unknown> = async () => ({ ok: false });

  return {
    supabaseCalls,
    setHandler(next: typeof handler) {
      handler = next;
    },
    resetHandler() {
      handler = () => ({ data: null, error: null });
    },
    supabase: {
      from: (table: string) => makeBuilder(table),
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, bytes: unknown, options: unknown) => {
            const upload = { bucket, path, bytes, options };
            storageUploads.push(upload);
            return storageHandler(upload);
          },
        }),
      },
    },
    storageUploads,
    setStorageHandler(next: typeof storageHandler) {
      storageHandler = next;
    },
    resetStorageHandler() {
      storageHandler = () => ({ error: null });
    },
    apiCalls,
    setApiHandler(next: typeof apiHandler) {
      apiHandler = next;
    },
    resetApiHandler() {
      apiHandler = async () => ({ ok: false });
    },
    callApi(call: ApiCall) {
      return apiHandler(call);
    },
  };
});

vi.mock("../supabase", () => ({ supabase: state.supabase }));
vi.mock("../api", () => ({
  createMutationOperation: (payload: Record<string, unknown>) => ({
    localOperationId: "local-op",
    idempotencyKey: "idem-key",
    requestId: "req-id",
    payload,
    payloadSchemaVersion: "1",
    createdAt: "2026-07-26T00:00:00.000Z",
  }),
  apiMutation: (method: string, path: string, operation: { payload: Record<string, unknown> }) => {
    const call = { method, path, payload: operation.payload };
    state.apiCalls.push(call);
    return state.callApi(call);
  },
}));

import {
  REQUIRED_FACE_ANGLES,
  fetchFaceCaptureConsent,
  submitFaceCapture,
  toApiAngle,
  uploadFaceScanImage,
  type CapturedAngle,
  type FaceAngle,
} from "../faceatlas-service";

const USER = "11111111-2222-3333-4444-555555555555";

function goodCapture(angle: FaceAngle, overrides: Partial<CapturedAngle["metadata"]> = {}): CapturedAngle {
  return {
    capturedAt: "2026-07-26T10:00:00.000Z",
    bytes: new Uint8Array([1, 2, 3]),
    metadata: { angle, width: 1080, height: 1440, bytes: 350_000, ...overrides },
  };
}

/** Default backend behavior: create every scan row with honest pending_upload. */
function apiCreatesPendingUpload() {
  state.setApiHandler(async (call) => ({
    ok: true,
    status: "pending_upload",
    scan: {
      id: `scan-${call.payload.angle}`,
      angle: call.payload.angle,
      status: "pending_upload",
      capturedAt: call.payload.capturedAt,
      storagePath: null,
      rawImageDeletedAt: null,
      createdAt: "2026-07-26T10:00:01.000Z",
      updatedAt: "2026-07-26T10:00:01.000Z",
    },
  }));
}

beforeEach(() => {
  state.supabaseCalls.length = 0;
  state.storageUploads.length = 0;
  state.apiCalls.length = 0;
  state.resetHandler();
  state.resetStorageHandler();
  state.resetApiHandler();
});

describe("toApiAngle", () => {
  it("maps every engine angle to the backend vocabulary with nothing missing", () => {
    expect(REQUIRED_FACE_ANGLES.map((angle) => [angle, toApiAngle(angle)])).toEqual([
      ["front", "front"],
      ["left_45", "left"],
      ["right_45", "right"],
      ["forehead_upper", "forehead"],
      ["chin_lower", "chin_up"],
    ]);
  });
});

describe("fetchFaceCaptureConsent", () => {
  it("treats absent consent rows as no consent, not as an error", async () => {
    const consent = await fetchFaceCaptureConsent(USER);
    expect(consent).toEqual({ rawImageLearning: false, rawImageRetention: false });
  });

  it("reads both consents when the rows exist and are true", async () => {
    state.setHandler((call) => {
      if (call.table === "consent_settings") {
        return { data: { raw_image_learning: true }, error: null };
      }
      if (call.table === "consents") {
        return { data: { raw_image_retention: true }, error: null };
      }
      return { data: null, error: null };
    });

    const consent = await fetchFaceCaptureConsent(USER);
    expect(consent).toEqual({ rawImageLearning: true, rawImageRetention: true });
  });

  it("falls back to no retention consent when the web-owned consents row is unreadable", async () => {
    state.setHandler((call) => {
      if (call.table === "consent_settings") {
        return { data: { raw_image_learning: true }, error: null };
      }
      return { data: null, error: { message: "permission denied for table consents" } };
    });

    const consent = await fetchFaceCaptureConsent(USER);
    expect(consent).toEqual({ rawImageLearning: true, rawImageRetention: false });
  });

  it("fails closed when the capture-gating consent cannot be read", async () => {
    state.setHandler((call) => {
      if (call.table === "consent_settings") {
        return { data: null, error: { message: "TypeError: Network request failed" } };
      }
      return { data: null, error: null };
    });

    await expect(fetchFaceCaptureConsent(USER)).rejects.toThrow("consents_fetch_failed");
  });
});

describe("uploadFaceScanImage", () => {
  it("skips honestly without touching storage when retention consent is absent", async () => {
    const result = await uploadFaceScanImage({
      userId: USER,
      scanId: "scan-1",
      angle: "front",
      bytes: new Uint8Array([1]),
      hasRetentionConsent: false,
    });

    expect(result).toEqual({ state: "skipped_consent_absent", path: null });
    expect(state.storageUploads).toHaveLength(0);
  });

  it("uploads to the user-scoped path using the API angle vocabulary", async () => {
    const result = await uploadFaceScanImage({
      userId: USER,
      scanId: "scan-1",
      angle: "chin_lower",
      bytes: new Uint8Array([1]),
      hasRetentionConsent: true,
    });

    expect(result).toEqual({ state: "stored", path: `${USER}/scan-1/chin_up.jpg` });
    expect(state.storageUploads).toHaveLength(1);
    expect(state.storageUploads[0].bucket).toBe("face-scans-raw");
    expect(state.storageUploads[0].path).toBe(`${USER}/scan-1/chin_up.jpg`);
    expect(state.storageUploads[0].options).toEqual({ contentType: "image/jpeg", upsert: false });
  });

  it("reports a failed upload instead of pretending it was stored", async () => {
    state.setStorageHandler(() => ({ error: { message: "new row violates row-level security" } }));

    const result = await uploadFaceScanImage({
      userId: USER,
      scanId: "scan-1",
      angle: "front",
      bytes: new Uint8Array([1]),
      hasRetentionConsent: true,
    });

    expect(result).toEqual({
      state: "failed",
      path: null,
      error: "new row violates row-level security",
    });
  });
});

describe("submitFaceCapture", () => {
  it("creates all five rows as pending_upload and uploads with retention consent", async () => {
    apiCreatesPendingUpload();

    const result = await submitFaceCapture({
      userId: USER,
      captures: REQUIRED_FACE_ANGLES.map((angle) => goodCapture(angle)),
      analysisConsent: true,
      consent: { rawImageLearning: true, rawImageRetention: true },
    });

    expect(result.allCreated).toBe(true);
    expect(result.quality.state).toBe("ready");
    expect(result.results).toHaveLength(5);
    for (const angleResult of result.results) {
      // Status comes from the backend contract — never advanced client-side.
      expect(angleResult.scanStatus).toBe("pending_upload");
      expect(angleResult.upload?.state).toBe("stored");
    }
    expect(state.storageUploads.map((upload) => upload.path)).toEqual(
      REQUIRED_FACE_ANGLES.map((angle) => `${USER}/scan-${toApiAngle(angle)}/${toApiAngle(angle)}.jpg`)
    );
    expect(state.apiCalls.every((call) => call.path === "/api/faceatlas/scans")).toBe(true);
  });

  it("records honest quality notes on each scan payload, including issue codes", async () => {
    apiCreatesPendingUpload();

    await submitFaceCapture({
      userId: USER,
      captures: [
        goodCapture("front", { width: 320, height: 240 }),
        ...REQUIRED_FACE_ANGLES.filter((angle) => angle !== "front").map((angle) =>
          goodCapture(angle)
        ),
      ],
      analysisConsent: true,
      consent: { rawImageLearning: true, rawImageRetention: true },
    });

    const frontPayload = state.apiCalls.find((call) => call.payload.angle === "front")?.payload;
    expect(frontPayload?.notes).toBe(
      "local_quality_state=partial; local_quality_issues=resolution_low; local_checks=capture_metadata_only"
    );
    const leftPayload = state.apiCalls.find((call) => call.payload.angle === "left")?.payload;
    expect(leftPayload?.notes).toBe(
      "local_quality_state=partial; local_checks=capture_metadata_only"
    );
  });

  it("isolates per-angle failures instead of failing or faking the whole batch", async () => {
    state.setApiHandler(async (call) => {
      if (call.payload.angle === "left") throw new Error("database_unavailable");
      return {
        ok: true,
        status: "pending_upload",
        scan: {
          id: `scan-${call.payload.angle}`,
          angle: call.payload.angle,
          status: "pending_upload",
          capturedAt: call.payload.capturedAt,
          storagePath: null,
          rawImageDeletedAt: null,
          createdAt: "2026-07-26T10:00:01.000Z",
          updatedAt: "2026-07-26T10:00:01.000Z",
        },
      };
    });

    const result = await submitFaceCapture({
      userId: USER,
      captures: REQUIRED_FACE_ANGLES.map((angle) => goodCapture(angle)),
      analysisConsent: true,
      consent: { rawImageLearning: true, rawImageRetention: true },
    });

    expect(result.allCreated).toBe(false);
    const failed = result.results.find((angleResult) => angleResult.angle === "left_45");
    expect(failed).toMatchObject({
      scanId: null,
      scanStatus: null,
      upload: null,
      error: "database_unavailable",
    });
    const succeeded = result.results.filter((angleResult) => angleResult.scanId !== null);
    expect(succeeded).toHaveLength(4);
    // No upload is attempted for the angle whose row was never created.
    expect(state.storageUploads).toHaveLength(4);
  });

  it("surfaces a malformed backend response as an honest per-angle error", async () => {
    state.setApiHandler(async () => ({ ok: true }));

    const result = await submitFaceCapture({
      userId: USER,
      captures: [goodCapture("front")],
      analysisConsent: true,
      consent: { rawImageLearning: true, rawImageRetention: true },
    });

    expect(result.allCreated).toBe(false);
    expect(result.results[0].error).toBe("face_scan_create_failed: malformed_response");
  });

  it("skips every upload when retention consent is absent and says so per angle", async () => {
    apiCreatesPendingUpload();

    const result = await submitFaceCapture({
      userId: USER,
      captures: REQUIRED_FACE_ANGLES.map((angle) => goodCapture(angle)),
      analysisConsent: true,
      consent: { rawImageLearning: true, rawImageRetention: false },
    });

    expect(result.allCreated).toBe(true);
    expect(state.storageUploads).toHaveLength(0);
    for (const angleResult of result.results) {
      expect(angleResult.upload).toEqual({ state: "skipped_consent_absent", path: null });
    }
    // The consent flag sent to the backend must reflect reality.
    expect(state.apiCalls.every((call) => call.payload.rawImageRetention === false)).toBe(true);
  });

  it("attempts no upload when there are no local bytes for an angle", async () => {
    apiCreatesPendingUpload();

    const result = await submitFaceCapture({
      userId: USER,
      captures: [{ ...goodCapture("front"), bytes: null }],
      analysisConsent: true,
      consent: { rawImageLearning: true, rawImageRetention: true },
    });

    expect(result.results[0].upload).toBeNull();
    expect(state.storageUploads).toHaveLength(0);
  });

  it("reports insufficient_data honestly when angles are missing", async () => {
    apiCreatesPendingUpload();

    const result = await submitFaceCapture({
      userId: USER,
      captures: [goodCapture("front")],
      analysisConsent: true,
      consent: { rawImageLearning: true, rawImageRetention: false },
    });

    expect(result.quality.state).toBe("insufficient_data");
    expect(result.quality.missingAngles).toEqual([
      "left_45",
      "right_45",
      "forehead_upper",
      "chin_lower",
    ]);
    expect(state.apiCalls[0].payload.notes).toBe(
      "local_quality_state=insufficient_data; local_checks=capture_metadata_only"
    );
  });
});
