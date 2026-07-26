/**
 * FaceAtlas Service
 *
 * Capture, quality-gating, persistence, and history for FaceAtlas scans.
 *
 * Write boundary (verified against live grants):
 * - `face_atlas_scans` and `face_scans` are SELECT-only for authenticated
 *   clients. All row creation goes through the backend
 *   `POST /api/faceatlas/scans` contract, which creates a `face_scans` row
 *   with the honest status `pending_upload`.
 * - The private `face-scans-raw` storage bucket accepts a user-scoped upload
 *   (first path segment = auth.uid()) only when the user's raw-image
 *   retention consent is recorded. There is no client-writable path that
 *   advances the scan status after an upload, so rows honestly remain
 *   `pending_upload` until server-side processing picks them up.
 */

import { supabase } from "./supabase";
import { apiMutation, createMutationOperation } from "./api";
import {
  assessFaceCapture,
  REQUIRED_FACE_ANGLES,
  type FaceAngle,
  type FaceCaptureMetadata,
  type FaceQualityResult,
} from "@acnetrex/ml-local-runtime";

export {
  REQUIRED_FACE_ANGLES,
  type FaceAngle,
  type FaceCaptureMetadata,
  type FaceQualityResult,
};

// ─── Types matching actual DB schema ─────────────────────────────────────────

/**
 * Phase-1 mobile summary table `face_atlas_scans` (SELECT-only, RLS
 * `user_id = auth.uid()::text`). These are the only columns that exist —
 * there is no `status` or `metadata` column on this table.
 */
export interface FaceAtlasScanSummary {
  id: string;
  user_id: string;
  scan_date: string;
  angles: Record<string, unknown> | unknown[];
  user_lesion_count: number | null;
  model_lesion_count: number | null;
  agreement_pct: number | null;
  oiliness_user: number | null;
  oiliness_model: number | null;
  confidence: string; // defaults to "insufficient_data" — honest fail-closed
  image_storage_ref: string | null;
  created_at: string;
}

/**
 * Canonical capture table `face_scans` (SELECT-only for clients; rows are
 * created by the backend scan contract with status `pending_upload`).
 */
export interface FaceScanRecord {
  id: string;
  user_id: string;
  captured_at: string;
  angle: string | null;
  storage_path: string | null;
  image_quality: number | null;
  oiliness_estimate: number | null;
  lesion_counts: Record<string, unknown> | null;
  labels: unknown[] | null;
  user_certainty: number | null;
  model_confidence: number | null;
  raw_image_deleted_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaceCaptureConsent {
  /** consent_settings.raw_image_learning — required before capturing. */
  rawImageLearning: boolean;
  /**
   * consents.raw_image_retention — gates the private-bucket upload; the
   * storage RLS policy rejects inserts without it.
   */
  rawImageRetention: boolean;
}

// ─── Angle vocabulary mapping ─────────────────────────────────────────────────
// The local quality engine and the backend scan contract use different angle
// vocabularies. Both are fixed contracts; this is the deterministic bridge.

const ENGINE_TO_API_ANGLE: Record<FaceAngle, string> = {
  front: "front",
  left_45: "left",
  right_45: "right",
  forehead_upper: "forehead",
  chin_lower: "chin_up",
};

export function toApiAngle(angle: FaceAngle): string {
  return ENGINE_TO_API_ANGLE[angle];
}

// ─── Consent ──────────────────────────────────────────────────────────────────

export async function fetchFaceCaptureConsent(
  userId: string
): Promise<FaceCaptureConsent> {
  const [settingsResult, consentsResult] = await Promise.all([
    supabase
      .from("consent_settings")
      .select("raw_image_learning")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("consents")
      .select("raw_image_retention")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (settingsResult.error) {
    throw new Error(`consents_fetch_failed: ${settingsResult.error.message}`);
  }
  // The consents row is owned by the web/backend flow and may legitimately be
  // absent for mobile-only accounts; absence honestly means no retention
  // consent is recorded, not an error.
  const rawImageRetention =
    !consentsResult.error &&
    consentsResult.data?.raw_image_retention === true;

  return {
    rawImageLearning: settingsResult.data?.raw_image_learning === true,
    rawImageRetention,
  };
}

// ─── Quality gate ─────────────────────────────────────────────────────────────

/**
 * Runs the deterministic capture-quality engine. The engine only inspects
 * capture metadata (dimensions, byte size, optional photometrics) — it does
 * not detect faces or lesions, and its `limitations` say so.
 */
export function assessCaptureQuality(
  captures: FaceCaptureMetadata[]
): FaceQualityResult {
  return assessFaceCapture(captures);
}

/** Honest, user-facing descriptions for engine issue codes. Nothing invented. */
export const QUALITY_ISSUE_GUIDANCE: Record<string, string> = {
  resolution_low:
    "The photo resolution is below 640x480. Move the camera closer or use a higher-resolution capture.",
  file_size_invalid:
    "The photo file is empty or larger than 4 MB, so it cannot be stored. Retake the photo.",
  lighting_out_of_range:
    "The measured brightness is outside the usable range. Retake in even, indirect light.",
  contrast_low:
    "The measured contrast is too low. Avoid haze or backlight and retake.",
  blur_possible:
    "The photo may be blurred. Hold the device steady and retake.",
};

// ─── Fetch scan history ──────────────────────────────────────────────────────

export async function fetchFaceAtlasScanSummaries(
  userId: string
): Promise<FaceAtlasScanSummary[]> {
  const { data, error } = await supabase
    .from("face_atlas_scans")
    .select(
      "id, user_id, scan_date, angles, user_lesion_count, model_lesion_count, agreement_pct, oiliness_user, oiliness_model, confidence, image_storage_ref, created_at"
    )
    .eq("user_id", userId)
    .order("scan_date", { ascending: false })
    .limit(20);

  if (error) throw new Error(`face_atlas_scans_fetch_failed: ${error.message}`);
  return (data ?? []) as FaceAtlasScanSummary[];
}

export async function fetchFaceScans(userId: string): Promise<FaceScanRecord[]> {
  const { data, error } = await supabase
    .from("face_scans")
    .select(
      "id, user_id, captured_at, angle, storage_path, image_quality, oiliness_estimate, lesion_counts, labels, user_certainty, model_confidence, raw_image_deleted_at, status, notes, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("captured_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`face_scans_fetch_failed: ${error.message}`);
  return (data ?? []) as FaceScanRecord[];
}

// ─── Create scan (backend contract) ──────────────────────────────────────────

interface CreateFaceScanResponse {
  ok: boolean;
  status: string;
  scan: {
    id: string;
    angle: string;
    status: string;
    capturedAt: string;
    storagePath: string | null;
    rawImageDeletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Creates a scan row via `POST /api/faceatlas/scans`. Requires the user's
 * explicit in-flow analysis consent (the caller must not set it silently).
 * Throws honest error codes from the API layer: `api_not_configured`,
 * `auth_required`, `consent_required`, `database_unavailable`, ...
 */
export async function createFaceScan(input: {
  angle: FaceAngle;
  capturedAt: string;
  analysisConsent: true;
  rawImageRetention: boolean;
  notes?: string;
}): Promise<CreateFaceScanResponse["scan"]> {
  const operation = createMutationOperation({
    angle: toApiAngle(input.angle),
    capturedAt: input.capturedAt,
    analysisConsent: input.analysisConsent,
    rawImageRetention: input.rawImageRetention,
    ...(input.notes ? { notes: input.notes.slice(0, 2000) } : {}),
  });
  const response = await apiMutation<CreateFaceScanResponse, unknown>(
    "POST",
    "/api/faceatlas/scans",
    operation
  );
  if (!response.ok || !response.scan?.id) {
    throw new Error("face_scan_create_failed: malformed_response");
  }
  return response.scan;
}

// ─── Raw image upload (private bucket) ───────────────────────────────────────

export interface FaceScanUploadResult {
  state: "stored" | "skipped_consent_absent" | "failed";
  path: string | null;
  error?: string;
}

/**
 * Uploads the captured image to the private `face-scans-raw` bucket at
 * `{userId}/{scanId}/{angle}.jpg`. The bucket policy only accepts the upload
 * when raw-image retention consent is recorded server-side; without it we
 * skip honestly instead of attempting a write that RLS will reject.
 */
export async function uploadFaceScanImage(input: {
  userId: string;
  scanId: string;
  angle: FaceAngle;
  bytes: Uint8Array;
  hasRetentionConsent: boolean;
}): Promise<FaceScanUploadResult> {
  if (!input.hasRetentionConsent) {
    return { state: "skipped_consent_absent", path: null };
  }
  const path = `${input.userId}/${input.scanId}/${toApiAngle(input.angle)}.jpg`;
  const { error } = await supabase.storage
    .from("face-scans-raw")
    .upload(path, input.bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (error) {
    return { state: "failed", path: null, error: error.message };
  }
  return { state: "stored", path };
}

// ─── Full capture submission ─────────────────────────────────────────────────

export interface CapturedAngle {
  metadata: FaceCaptureMetadata;
  capturedAt: string;
  /** Local file bytes; only uploaded when retention consent is present. */
  bytes: Uint8Array | null;
}

export interface AngleSubmissionResult {
  angle: FaceAngle;
  scanId: string | null;
  /** Status returned by the backend contract; `pending_upload` on success. */
  scanStatus: string | null;
  upload: FaceScanUploadResult | null;
  error?: string;
}

export interface CaptureSubmissionResult {
  quality: FaceQualityResult;
  results: AngleSubmissionResult[];
  /** True only when every angle row was created by the backend. */
  allCreated: boolean;
}

function qualityNotes(quality: FaceQualityResult, angle: FaceAngle): string {
  const codes =
    quality.issues.find((issue) => issue.angle === angle)?.codes ?? [];
  const parts = [
    `local_quality_state=${quality.state}`,
    codes.length ? `local_quality_issues=${codes.join(",")}` : null,
    "local_checks=capture_metadata_only",
  ].filter(Boolean);
  return parts.join("; ");
}

/**
 * Persists a completed guided capture: one backend scan row per angle, then a
 * consent-gated raw-image upload per angle. Never fabricates success — each
 * angle carries its own honest outcome, and scan rows stay `pending_upload`
 * because no client-side contract exists to advance them.
 */
export async function submitFaceCapture(input: {
  userId: string;
  captures: CapturedAngle[];
  analysisConsent: true;
  consent: FaceCaptureConsent;
}): Promise<CaptureSubmissionResult> {
  const quality = assessCaptureQuality(
    input.captures.map((capture) => capture.metadata)
  );

  const results: AngleSubmissionResult[] = [];
  for (const capture of input.captures) {
    const angle = capture.metadata.angle;
    try {
      const scan = await createFaceScan({
        angle,
        capturedAt: capture.capturedAt,
        analysisConsent: input.analysisConsent,
        rawImageRetention: input.consent.rawImageRetention,
        notes: qualityNotes(quality, angle),
      });
      const upload = capture.bytes
        ? await uploadFaceScanImage({
            userId: input.userId,
            scanId: scan.id,
            angle,
            bytes: capture.bytes,
            hasRetentionConsent: input.consent.rawImageRetention,
          })
        : null;
      results.push({ angle, scanId: scan.id, scanStatus: scan.status, upload });
    } catch (error) {
      results.push({
        angle,
        scanId: null,
        scanStatus: null,
        upload: null,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return {
    quality,
    results,
    allCreated: results.every((result) => result.scanId !== null),
  };
}
