import "server-only";

import type { PoolClient } from "pg";
import { z } from "zod";
import {
  assessFaceCapture,
  type FaceAngle as EngineFaceAngle,
} from "../../../../packages/ml-local-runtime/src/deterministic/face-quality";
import { faceAtlasAngleSchema } from "@/lib/acnetrex/modules/schemas";
import { FaceAtlasScanNotFoundError, type FaceAtlasScan } from "./scans";

// ─── Shared storage contract (mirror of apps/mobile faceatlas-service.ts) ────
//
// The private `face-scans-raw` bucket is governed by three live policies
// (verified against supabase/migrations/20260714060500 + 20260710233922):
// - insert: authenticated user token, first path segment = auth.uid(), and
//   `consents.raw_image_retention is true`.
// - select/delete: owner folder only.
// There is no service-role upload path for clients; both web and mobile
// upload directly with the user's token to `{userId}/{scanId}/{angle}.jpg`.

export const FACE_SCANS_RAW_BUCKET = "face-scans-raw";
export const FACE_SCAN_UPLOAD_CONTENT_TYPE = "image/jpeg";

export type FaceAtlasApiAngle = z.infer<typeof faceAtlasAngleSchema>;

// API/DB angle vocabulary -> deterministic engine vocabulary. Both fixed
// contracts; inverse of the mobile ENGINE_TO_API_ANGLE bridge.
const API_TO_ENGINE_ANGLE: Record<FaceAtlasApiAngle, EngineFaceAngle> = {
  front: "front",
  left: "left_45",
  right: "right_45",
  forehead: "forehead_upper",
  chin_up: "chin_lower",
};

export function toEngineAngle(angle: FaceAtlasApiAngle): EngineFaceAngle {
  return API_TO_ENGINE_ANGLE[angle];
}

export function buildFaceScanStoragePath(
  userId: string,
  scanId: string,
  angle: FaceAtlasApiAngle,
): string {
  return `${userId}/${scanId}/${angle}.jpg`;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class FaceAtlasUploadConsentError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super("raw_image_consent_required");
    this.name = "FaceAtlasUploadConsentError";
    this.missing = missing;
  }
}

export class FaceAtlasScanStateError extends Error {
  readonly reason: "scan_not_awaiting_upload" | "upload_not_authorized";
  readonly currentStatus: string;

  constructor(reason: "scan_not_awaiting_upload" | "upload_not_authorized", currentStatus: string) {
    super(reason);
    this.name = "FaceAtlasScanStateError";
    this.reason = reason;
    this.currentStatus = currentStatus;
  }
}

export class FaceScanStorageError extends Error {
  readonly reason: "storage_not_configured" | "storage_unavailable";

  constructor(reason: "storage_not_configured" | "storage_unavailable", options?: { cause?: unknown }) {
    super(reason, options);
    this.name = "FaceScanStorageError";
    this.reason = reason;
  }
}

// ─── Row mapping (same columns as ./scans) ───────────────────────────────────

const SCAN_RETURNING = `id, angle, status, captured_at as "capturedAt",
             storage_path as "storagePath", raw_image_deleted_at as "rawImageDeletedAt",
             created_at as "createdAt", updated_at as "updatedAt"`;

type ScanRow = FaceAtlasScan;

// ─── Upload authorization ────────────────────────────────────────────────────

export type FaceScanUploadAuthorization = {
  scan: FaceAtlasScan;
  upload: {
    bucket: typeof FACE_SCANS_RAW_BUCKET;
    path: string;
    contentType: typeof FACE_SCAN_UPLOAD_CONTENT_TYPE;
    /**
     * The bucket policies only permit an authenticated user-token upload to
     * the owner-scoped path; there is no signed/service-role upload variant.
     */
    method: "user_token_upload";
  };
};

/**
 * Issues the canonical storage path for a scan's raw image and advances the
 * row `pending_upload -> uploading`. Refuses honestly (fail closed) when the
 * consents the storage RLS policy checks are not recorded, so the client
 * never attempts a write the bucket would reject.
 */
export async function authorizeFaceScanUpload(
  client: PoolClient,
  userId: string,
  scanId: string,
): Promise<FaceScanUploadAuthorization> {
  const scanResult = await client.query<ScanRow>(
    `select ${SCAN_RETURNING}
       from public.face_scans
      where id = $1::uuid and user_id = $2::uuid
      limit 1
        for update`,
    [scanId, userId],
  );
  const scan = scanResult.rows[0];
  if (!scan) throw new FaceAtlasScanNotFoundError();
  if (scan.status !== "pending_upload" && scan.status !== "uploading") {
    throw new FaceAtlasScanStateError("scan_not_awaiting_upload", scan.status);
  }

  const missing: string[] = [];
  const settings = await client.query<{ rawImageLearning: boolean | null }>(
    `select raw_image_learning as "rawImageLearning"
       from public.consent_settings
      where user_id = $1
      limit 1`,
    [userId],
  );
  if (settings.rows[0]?.rawImageLearning !== true) missing.push("consent_settings.raw_image_learning");
  const consents = await client.query<{ rawImageRetention: boolean | null }>(
    `select raw_image_retention as "rawImageRetention"
       from public.consents
      where user_id = $1::uuid
      limit 1`,
    [userId],
  );
  if (consents.rows[0]?.rawImageRetention !== true) missing.push("consents.raw_image_retention");
  if (missing.length > 0) throw new FaceAtlasUploadConsentError(missing);

  const path = buildFaceScanStoragePath(userId, scanId, scan.angle);
  const updated = await client.query<ScanRow>(
    `update public.face_scans
        set storage_path = $3, status = 'uploading', updated_at = now()
      where id = $1::uuid and user_id = $2::uuid
      returning ${SCAN_RETURNING}`,
    [scanId, userId, path],
  );
  const row = updated.rows[0];
  if (!row) throw new Error("faceatlas_upload_authorization_update_missing");

  await client.query(
    `insert into public.audit_logs
       (user_id, actor_type, action, target_table, target_id, metadata)
     values ($1::uuid, 'user', 'faceatlas_upload_authorized', 'face_scans', $2::uuid, $3::jsonb)`,
    [userId, scanId, JSON.stringify({ bucket: FACE_SCANS_RAW_BUCKET, path, angle: scan.angle })],
  );

  return {
    scan: row,
    upload: {
      bucket: FACE_SCANS_RAW_BUCKET,
      path,
      contentType: FACE_SCAN_UPLOAD_CONTENT_TYPE,
      method: "user_token_upload",
    },
  };
}

// ─── Object verification (server side, service role) ────────────────────────

export type FaceScanObjectInfo = {
  sizeBytes: number | null;
  contentType: string | null;
};

export interface FaceScanObjectStore {
  /** Returns object metadata, or null when the object does not exist. */
  getObjectInfo(path: string): Promise<FaceScanObjectInfo | null>;
}

type StorageErrorLike = { message?: string; status?: number; statusCode?: string | number };

function isObjectMissing(error: StorageErrorLike): boolean {
  return (
    error.status === 404 ||
    error.statusCode === 404 ||
    error.statusCode === "404" ||
    /object not found|not_found/i.test(error.message ?? "")
  );
}

function isBucketMissing(error: StorageErrorLike): boolean {
  return /bucket not found/i.test(error.message ?? "");
}

/**
 * Fail-closed object store backed by the server-side service-role client
 * (same convention as src/lib/storage.ts for the reports bucket). Missing
 * configuration surfaces as `storage_not_configured`, never as a fake
 * verification success.
 */
export async function getSupabaseFaceScanObjectStore(): Promise<FaceScanObjectStore> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new FaceScanStorageError("storage_not_configured");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    async getObjectInfo(path: string): Promise<FaceScanObjectInfo | null> {
      const { data, error } = await supabaseAdmin.storage.from(FACE_SCANS_RAW_BUCKET).info(path);
      if (error) {
        if (isObjectMissing(error)) return null;
        if (isBucketMissing(error)) throw new FaceScanStorageError("storage_not_configured", { cause: error });
        throw new FaceScanStorageError("storage_unavailable", { cause: error });
      }
      if (!data) return null;
      return {
        sizeBytes: typeof data.size === "number" ? data.size : null,
        contentType: typeof data.contentType === "string" ? data.contentType : null,
      };
    },
  };
}

// ─── Finalization ────────────────────────────────────────────────────────────

export const faceAtlasFinalizeRequestSchema = z.object({
  /** Client-reported pixel dimensions of the uploaded capture. */
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  /** Optional client-measured photometrics; never invented server-side. */
  brightness: z.number().min(0).max(1).optional(),
  contrast: z.number().min(0).max(1).optional(),
  blurVariance: z.number().min(0).max(1_000_000).optional(),
});

export type FaceAtlasFinalizeRequest = z.infer<typeof faceAtlasFinalizeRequestSchema>;

export type FaceScanQualityReport = {
  engine: "deterministic_capture_quality";
  scope: "single_angle";
  verifiedBytes: number;
  clientReportedDimensions: { width: number; height: number };
  issueCodes: string[];
  limitations: string[];
};

export type FaceScanFinalizeResult =
  | { outcome: "already_finalized"; scan: FaceAtlasScan }
  | { outcome: "finalized"; scan: FaceAtlasScan; quality: FaceScanQualityReport; jobId: string };

/**
 * Verifies nothing itself — callers must have confirmed the raw object exists
 * (`objectInfo` carries the storage-reported byte size). Runs the
 * deterministic capture-quality engine over the verified byte size plus the
 * client-reported dimensions, records the honest result in the scan's notes
 * (same key=value convention the mobile client writes), queues a durable
 * `ml_analysis_jobs` faceatlas/capture_quality job through the existing
 * pipeline, and advances `uploading -> queued_for_cloud` atomically. The
 * status is only ever `queued_for_cloud` because a real queued job exists in
 * the same transaction.
 */
export async function finalizeFaceScanUpload(
  client: PoolClient,
  userId: string,
  scanId: string,
  input: FaceAtlasFinalizeRequest,
  objectInfo: { sizeBytes: number },
): Promise<FaceScanFinalizeResult> {
  const scanResult = await client.query<ScanRow>(
    `select ${SCAN_RETURNING}
       from public.face_scans
      where id = $1::uuid and user_id = $2::uuid
      limit 1
        for update`,
    [scanId, userId],
  );
  const scan = scanResult.rows[0];
  if (!scan) throw new FaceAtlasScanNotFoundError();
  if (scan.status === "queued_for_cloud") {
    return { outcome: "already_finalized", scan };
  }
  if (scan.status !== "uploading" || !scan.storagePath) {
    throw new FaceAtlasScanStateError("upload_not_authorized", scan.status);
  }

  const engineAngle = toEngineAngle(scan.angle);
  const engineResult = assessFaceCapture([
    {
      angle: engineAngle,
      width: input.width,
      height: input.height,
      bytes: objectInfo.sizeBytes,
      ...(input.brightness !== undefined ? { brightness: input.brightness } : {}),
      ...(input.contrast !== undefined ? { contrast: input.contrast } : {}),
      ...(input.blurVariance !== undefined ? { blurVariance: input.blurVariance } : {}),
    },
  ]);
  const issueCodes = engineResult.issues.find((issue) => issue.angle === engineAngle)?.codes ?? [];
  const quality: FaceScanQualityReport = {
    engine: "deterministic_capture_quality",
    scope: "single_angle",
    verifiedBytes: objectInfo.sizeBytes,
    clientReportedDimensions: { width: input.width, height: input.height },
    issueCodes,
    limitations: [
      ...engineResult.limitations,
      "Dimensions and photometrics are client-reported; only the byte size was verified against the stored object.",
    ],
  };

  // Durable capture_quality job through the existing ML jobs pipeline
  // (same columns/values as enqueueMlAnalysisJob in ../ml-analysis-jobs.ts,
  // inlined here so the scan transition and the queued job commit atomically).
  const features = {
    scanId,
    captureScope: "single_angle",
    images: [
      {
        angle: engineAngle,
        width: input.width,
        height: input.height,
        bytes: objectInfo.sizeBytes,
        ...(input.brightness !== undefined ? { mean_brightness: input.brightness } : {}),
        ...(input.contrast !== undefined ? { contrast: input.contrast } : {}),
        ...(input.blurVariance !== undefined ? { laplacian_variance: input.blurVariance } : {}),
      },
    ],
  };
  const jobInsert = await client.query<{ id: string }>(
    `insert into public.ml_analysis_jobs
       (user_id, engine, operation, runtime_mode, status, input_record_refs,
        feature_schema_version, features, features_missing, app_version, schema_version)
     values ($1::uuid, 'faceatlas', 'capture_quality', 'queued_for_cloud', 'queued', $2::jsonb,
             '1.0.0', $3::jsonb, '[]'::jsonb, null, '1')
     returning id`,
    [userId, JSON.stringify([{ table: "face_scans", id: scanId }]), JSON.stringify(features)],
  );
  const jobId = jobInsert.rows[0]?.id;
  if (!jobId) throw new Error("faceatlas_capture_quality_job_insert_missing");
  await client.query(
    `insert into public.outbox_events
       (event_type, aggregate_type, aggregate_id, user_id, payload, deduplication_key)
     values ('ml.analysis.requested', 'ml_analysis_job', $1, $2::uuid, $3::jsonb, $4)
     on conflict (deduplication_key) do nothing`,
    [
      jobId,
      userId,
      JSON.stringify({ jobId, requestId: jobId, engine: "faceatlas", operation: "capture_quality" }),
      `faceatlas-finalize:${userId}:${scanId}`,
    ],
  );

  // Honest quality record in scan metadata: same notes key=value convention
  // the mobile client uses (`local_quality_*`), namespaced `server_*`.
  const qualityNote = [
    `server_upload_verified_bytes=${objectInfo.sizeBytes}`,
    `server_quality_issues=${issueCodes.length > 0 ? issueCodes.join(",") : "none"}`,
    "server_checks=storage_object_bytes_and_client_reported_dimensions",
  ].join("; ");
  const updated = await client.query<ScanRow>(
    `update public.face_scans
        set status = 'queued_for_cloud',
            notes = case when notes is null or notes = '' then $3 else notes || '; ' || $3 end,
            updated_at = now()
      where id = $1::uuid and user_id = $2::uuid and status = 'uploading'
      returning ${SCAN_RETURNING}`,
    [scanId, userId, qualityNote],
  );
  const row = updated.rows[0];
  if (!row) throw new Error("faceatlas_finalize_update_missing");

  await client.query(
    `insert into public.audit_logs
       (user_id, actor_type, action, target_table, target_id, metadata)
     values ($1::uuid, 'user', 'faceatlas_scan_finalized', 'face_scans', $2::uuid, $3::jsonb)`,
    [
      userId,
      scanId,
      JSON.stringify({
        jobId,
        verifiedBytes: objectInfo.sizeBytes,
        qualityIssues: issueCodes,
        checks: "storage_object_bytes_and_client_reported_dimensions",
      }),
    ],
  );

  return { outcome: "finalized", scan: row, quality, jobId };
}
