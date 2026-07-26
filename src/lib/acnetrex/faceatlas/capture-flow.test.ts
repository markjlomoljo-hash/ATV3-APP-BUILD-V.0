import { describe, expect, it, vi } from "vitest";

import {
  evaluateCaptureUploadGate,
  runFaceCaptureUploadFlow,
  type CaptureFlowDeps,
} from "./capture-flow";

const scanId = "11111111-1111-4111-8111-111111111111";
const consentGranted = { rawImageLearning: true, rawImageRetention: true };

function deps(overrides: Partial<CaptureFlowDeps> = {}): CaptureFlowDeps {
  return {
    createScan: vi.fn().mockResolvedValue({ ok: true, scan: { id: scanId, status: "pending_upload" } }),
    authorizeUpload: vi.fn().mockResolvedValue({ ok: true, path: `user/${scanId}/front.jpg`, scanStatus: "uploading" }),
    uploadObject: vi.fn().mockResolvedValue({ ok: true }),
    finalizeScan: vi.fn().mockResolvedValue({
      ok: true,
      scanStatus: "queued_for_cloud",
      alreadyFinalized: false,
      qualityIssueCodes: ["resolution_low"],
    }),
    ...overrides,
  };
}

describe("evaluateCaptureUploadGate", () => {
  it("skips honestly when no file is selected", () => {
    expect(
      evaluateCaptureUploadGate({ consent: consentGranted, file: null, captureRetentionRequested: true }),
    ).toEqual({
      allowed: false,
      reason: "file_missing",
    });
  });

  it("refuses non-JPEG files (shared storage contract)", () => {
    expect(
      evaluateCaptureUploadGate({
        consent: consentGranted,
        file: { type: "image/png" },
        captureRetentionRequested: true,
      }),
    ).toEqual({
      allowed: false,
      reason: "unsupported_file_type",
    });
  });

  it("refuses when the per-capture retain choice is declined, even with both DB consents recorded", () => {
    expect(
      evaluateCaptureUploadGate({
        consent: consentGranted,
        file: { type: "image/jpeg" },
        captureRetentionRequested: false,
      }),
    ).toEqual({ allowed: false, reason: "capture_retention_declined" });
  });

  it("reports the per-capture refusal ahead of missing DB consents (explicit refusal wins)", () => {
    expect(
      evaluateCaptureUploadGate({
        consent: { rawImageLearning: false, rawImageRetention: false },
        file: { type: "image/jpeg" },
        captureRetentionRequested: false,
      }),
    ).toEqual({ allowed: false, reason: "capture_retention_declined" });
  });

  it("refuses when the consent_settings raw-image consent is not recorded", () => {
    expect(
      evaluateCaptureUploadGate({
        consent: { rawImageLearning: false, rawImageRetention: true },
        file: { type: "image/jpeg" },
        captureRetentionRequested: true,
      }),
    ).toEqual({ allowed: false, reason: "raw_image_learning_consent_missing" });
  });

  it("refuses when the bucket-policy retention consent is not recorded", () => {
    expect(
      evaluateCaptureUploadGate({
        consent: { rawImageLearning: true, rawImageRetention: false },
        file: { type: "image/jpeg" },
        captureRetentionRequested: true,
      }),
    ).toEqual({ allowed: false, reason: "raw_image_retention_consent_missing" });
  });

  it("allows the upload only when file type, per-capture choice, and both consents line up", () => {
    expect(
      evaluateCaptureUploadGate({
        consent: consentGranted,
        file: { type: "image/jpeg" },
        captureRetentionRequested: true,
      }),
    ).toEqual({
      allowed: true,
    });
  });
});

describe("runFaceCaptureUploadFlow", () => {
  it("reports a create failure without attempting any raw-image step", async () => {
    const flowDeps = deps({ createScan: vi.fn().mockResolvedValue({ ok: false, code: "consent_required" }) });
    const outcome = await runFaceCaptureUploadFlow(flowDeps, { allowed: true });
    expect(outcome).toEqual({
      scanId: null,
      scanStatus: null,
      upload: "not_attempted",
      finalize: "not_attempted",
      qualityIssueCodes: null,
      error: { step: "create", code: "consent_required" },
    });
    expect(flowDeps.authorizeUpload).not.toHaveBeenCalled();
    expect(flowDeps.uploadObject).not.toHaveBeenCalled();
  });

  it("saves metadata-only capture and uploads nothing when per-capture retention is declined", async () => {
    const flowDeps = deps();
    const outcome = await runFaceCaptureUploadFlow(flowDeps, {
      allowed: false,
      reason: "capture_retention_declined",
    });
    expect(outcome.scanId).toBe(scanId);
    expect(outcome.scanStatus).toBe("pending_upload");
    expect(outcome.upload).toBe("skipped_retention_declined");
    expect(outcome.finalize).toBe("skipped");
    expect(outcome.error).toBeNull();
    expect(flowDeps.createScan).toHaveBeenCalledTimes(1);
    expect(flowDeps.authorizeUpload).not.toHaveBeenCalled();
    expect(flowDeps.uploadObject).not.toHaveBeenCalled();
    expect(flowDeps.finalizeScan).not.toHaveBeenCalled();
  });

  it("saves metadata-only capture when the consent gate blocks the upload", async () => {
    const flowDeps = deps();
    const outcome = await runFaceCaptureUploadFlow(flowDeps, {
      allowed: false,
      reason: "raw_image_retention_consent_missing",
    });
    expect(outcome.scanId).toBe(scanId);
    expect(outcome.scanStatus).toBe("pending_upload");
    expect(outcome.upload).toBe("skipped_consent_absent");
    expect(outcome.finalize).toBe("skipped");
    expect(outcome.error).toBeNull();
    expect(flowDeps.authorizeUpload).not.toHaveBeenCalled();
    expect(flowDeps.uploadObject).not.toHaveBeenCalled();
    expect(flowDeps.finalizeScan).not.toHaveBeenCalled();
  });

  it("keeps the honest pending_upload status when authorization is refused", async () => {
    const flowDeps = deps({
      authorizeUpload: vi.fn().mockResolvedValue({ ok: false, code: "consent_required" }),
    });
    const outcome = await runFaceCaptureUploadFlow(flowDeps, { allowed: true });
    expect(outcome.scanStatus).toBe("pending_upload");
    expect(outcome.upload).toBe("failed");
    expect(outcome.finalize).toBe("not_attempted");
    expect(outcome.error).toEqual({ step: "authorize", code: "consent_required" });
    expect(flowDeps.uploadObject).not.toHaveBeenCalled();
  });

  it("never claims storage success when the user-token upload fails", async () => {
    const flowDeps = deps({
      uploadObject: vi.fn().mockResolvedValue({ ok: false, code: "new row violates row-level security policy" }),
    });
    const outcome = await runFaceCaptureUploadFlow(flowDeps, { allowed: true });
    expect(outcome.scanStatus).toBe("uploading");
    expect(outcome.upload).toBe("failed");
    expect(outcome.finalize).toBe("not_attempted");
    expect(outcome.error?.step).toBe("upload");
    expect(flowDeps.finalizeScan).not.toHaveBeenCalled();
  });

  it("keeps the stored upload but reports a failed finalization honestly", async () => {
    const flowDeps = deps({
      finalizeScan: vi.fn().mockResolvedValue({ ok: false, code: "raw_object_missing" }),
    });
    const outcome = await runFaceCaptureUploadFlow(flowDeps, { allowed: true });
    expect(outcome.upload).toBe("stored");
    expect(outcome.finalize).toBe("failed");
    expect(outcome.scanStatus).toBe("uploading");
    expect(outcome.qualityIssueCodes).toBeNull();
    expect(outcome.error).toEqual({ step: "finalize", code: "raw_object_missing" });
  });

  it("propagates the real quality issue codes on a completed flow", async () => {
    const flowDeps = deps();
    const outcome = await runFaceCaptureUploadFlow(flowDeps, { allowed: true });
    expect(outcome).toEqual({
      scanId,
      scanStatus: "queued_for_cloud",
      upload: "stored",
      finalize: "queued_for_cloud",
      qualityIssueCodes: ["resolution_low"],
      error: null,
    });
    expect(flowDeps.uploadObject).toHaveBeenCalledWith(`user/${scanId}/front.jpg`);
  });

  it("reports replayed finalizations as already_finalized, not as a new analysis", async () => {
    const flowDeps = deps({
      finalizeScan: vi.fn().mockResolvedValue({
        ok: true,
        scanStatus: "queued_for_cloud",
        alreadyFinalized: true,
        qualityIssueCodes: [],
      }),
    });
    const outcome = await runFaceCaptureUploadFlow(flowDeps, { allowed: true });
    expect(outcome.finalize).toBe("already_finalized");
    expect(outcome.qualityIssueCodes).toEqual([]);
  });
});
