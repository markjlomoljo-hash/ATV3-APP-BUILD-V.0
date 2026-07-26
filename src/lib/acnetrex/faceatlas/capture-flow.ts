// Browser-side FaceAtlas capture upload flow. Client-safe: no server-only
// imports. The panel injects real implementations (API fetches + the
// user-token storage upload); tests inject fakes. Every step reports its
// honest outcome — the flow never fabricates a success for a later step when
// an earlier one failed or was skipped.

export type FaceCaptureConsentState = {
  /** consent_settings.raw_image_learning — capture-side raw-image consent. */
  rawImageLearning: boolean;
  /** consents.raw_image_retention — the consent the bucket RLS policy checks. */
  rawImageRetention: boolean;
};

export type CaptureUploadGateReason =
  | "file_missing"
  | "unsupported_file_type"
  | "dimensions_unmeasurable"
  | "capture_retention_declined"
  | "raw_image_learning_consent_missing"
  | "raw_image_retention_consent_missing";

export type CaptureUploadGate =
  | { allowed: true }
  | { allowed: false; reason: CaptureUploadGateReason };

/**
 * Deterministic pre-upload gate. The shared storage contract only accepts
 * JPEG at `{userId}/{scanId}/{angle}.jpg`, and the bucket policy rejects
 * uploads without recorded retention consent, so the gate refuses before any
 * bytes leave the browser.
 *
 * Uploading to the private bucket IS retention (nothing downstream deletes
 * the object and the pipeline never fetches the bytes), so the user's
 * explicit per-capture choice (`captureRetentionRequested`, the "retain the
 * raw image" checkbox) must block the upload when declined — it is checked
 * before the account-level DB consents because an explicit refusal for this
 * capture overrides whatever consents are on record.
 */
export function evaluateCaptureUploadGate(input: {
  consent: FaceCaptureConsentState;
  file: { type: string } | null;
  /** The per-capture "retain the raw image" choice; false = explicit refusal. */
  captureRetentionRequested: boolean;
}): CaptureUploadGate {
  if (!input.file) return { allowed: false, reason: "file_missing" };
  if (input.file.type !== "image/jpeg") return { allowed: false, reason: "unsupported_file_type" };
  if (!input.captureRetentionRequested) {
    return { allowed: false, reason: "capture_retention_declined" };
  }
  if (!input.consent.rawImageLearning) {
    return { allowed: false, reason: "raw_image_learning_consent_missing" };
  }
  if (!input.consent.rawImageRetention) {
    return { allowed: false, reason: "raw_image_retention_consent_missing" };
  }
  return { allowed: true };
}

export type CaptureFlowStep = "create" | "authorize" | "upload" | "finalize";

export type CaptureFlowOutcome = {
  scanId: string | null;
  /** Last scan status actually reported by the backend; never invented. */
  scanStatus: string | null;
  upload:
    | "stored"
    | "skipped_no_file"
    | "skipped_unsupported_file"
    | "skipped_unmeasurable_dimensions"
    | "skipped_retention_declined"
    | "skipped_consent_absent"
    | "failed"
    | "not_attempted";
  finalize: "queued_for_cloud" | "already_finalized" | "failed" | "skipped" | "not_attempted";
  qualityIssueCodes: string[] | null;
  error: { step: CaptureFlowStep; code: string } | null;
};

export interface CaptureFlowDeps {
  createScan(): Promise<{ ok: true; scan: { id: string; status: string } } | { ok: false; code: string }>;
  authorizeUpload(
    scanId: string,
  ): Promise<{ ok: true; path: string; scanStatus: string } | { ok: false; code: string }>;
  uploadObject(path: string): Promise<{ ok: true } | { ok: false; code: string }>;
  finalizeScan(scanId: string): Promise<
    | { ok: true; scanStatus: string; alreadyFinalized: boolean; qualityIssueCodes: string[] }
    | { ok: false; code: string }
  >;
}

function skippedUpload(reason: CaptureUploadGateReason): CaptureFlowOutcome["upload"] {
  switch (reason) {
    case "file_missing":
      return "skipped_no_file";
    case "unsupported_file_type":
      return "skipped_unsupported_file";
    case "dimensions_unmeasurable":
      return "skipped_unmeasurable_dimensions";
    case "capture_retention_declined":
      return "skipped_retention_declined";
    default:
      return "skipped_consent_absent";
  }
}

/**
 * Runs create -> authorize -> upload -> finalize, stopping at the first
 * failure with the honest partial state. A blocked gate still saves the
 * capture metadata (the scan row stays at its real `pending_upload` status)
 * but skips every raw-image step.
 */
export async function runFaceCaptureUploadFlow(
  deps: CaptureFlowDeps,
  gate: CaptureUploadGate,
): Promise<CaptureFlowOutcome> {
  const created = await deps.createScan();
  if (!created.ok) {
    return {
      scanId: null,
      scanStatus: null,
      upload: "not_attempted",
      finalize: "not_attempted",
      qualityIssueCodes: null,
      error: { step: "create", code: created.code },
    };
  }

  if (!gate.allowed) {
    return {
      scanId: created.scan.id,
      scanStatus: created.scan.status,
      upload: skippedUpload(gate.reason),
      finalize: "skipped",
      qualityIssueCodes: null,
      error: null,
    };
  }

  const authorized = await deps.authorizeUpload(created.scan.id);
  if (!authorized.ok) {
    return {
      scanId: created.scan.id,
      scanStatus: created.scan.status,
      upload: "failed",
      finalize: "not_attempted",
      qualityIssueCodes: null,
      error: { step: "authorize", code: authorized.code },
    };
  }

  const uploaded = await deps.uploadObject(authorized.path);
  if (!uploaded.ok) {
    return {
      scanId: created.scan.id,
      scanStatus: authorized.scanStatus,
      upload: "failed",
      finalize: "not_attempted",
      qualityIssueCodes: null,
      error: { step: "upload", code: uploaded.code },
    };
  }

  const finalized = await deps.finalizeScan(created.scan.id);
  if (!finalized.ok) {
    return {
      scanId: created.scan.id,
      scanStatus: authorized.scanStatus,
      upload: "stored",
      finalize: "failed",
      qualityIssueCodes: null,
      error: { step: "finalize", code: finalized.code },
    };
  }

  return {
    scanId: created.scan.id,
    scanStatus: finalized.scanStatus,
    upload: "stored",
    finalize: finalized.alreadyFinalized ? "already_finalized" : "queued_for_cloud",
    qualityIssueCodes: finalized.qualityIssueCodes,
    error: null,
  };
}
