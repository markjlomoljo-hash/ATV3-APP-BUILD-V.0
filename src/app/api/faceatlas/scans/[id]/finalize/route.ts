import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { FaceAtlasScanNotFoundError, getFaceAtlasScan } from "@/lib/acnetrex/faceatlas/scans";
import {
  FaceAtlasScanStateError,
  FaceScanStorageError,
  faceAtlasFinalizeRequestSchema,
  finalizeFaceScanUpload,
  getSupabaseFaceScanObjectStore,
} from "@/lib/acnetrex/faceatlas/upload";
import { executeIdempotent } from "@/lib/reliability/idempotency";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return jsonError("invalid_scan_id", 400);
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 16 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = faceAtlasFinalizeRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_faceatlas_finalize_payload", 400, parsed.error.issues);

  try {
    getDb();
    // Pre-checks outside the idempotent transaction: current scan state and
    // real object existence (the transaction re-guards the state under lock).
    const { scan } = await getFaceAtlasScan(auth.userId, id);
    if (scan.status === "queued_for_cloud") {
      return NextResponse.json({ ok: true, status: scan.status, scan, alreadyFinalized: true });
    }
    if (scan.status !== "uploading" || !scan.storagePath) {
      return jsonError("upload_not_authorized", 409, { status: scan.status });
    }
    const store = await getSupabaseFaceScanObjectStore();
    const objectInfo = await store.getObjectInfo(scan.storagePath);
    if (!objectInfo) {
      // Honest fail-closed: the raw bytes never arrived, so the scan keeps
      // its real `uploading` status and no quality result is invented.
      return jsonError("raw_object_missing", 409, { status: scan.status });
    }
    if (typeof objectInfo.sizeBytes !== "number") {
      return jsonError("storage_unavailable", 503, { reason: "object_size_unreported" });
    }
    const sizeBytes = objectInfo.sizeBytes;

    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "faceatlas-finalize",
      key: idempotencyKey.data,
      method: "POST",
      route: "/api/faceatlas/scans/[id]/finalize",
      payload: { scanId: id, ...parsed.data },
      execute: async (client) => {
        const finalized = await finalizeFaceScanUpload(client, auth.userId, id, parsed.data, {
          sizeBytes,
        });
        if (finalized.outcome === "already_finalized") {
          return {
            status: 200,
            reference: { ok: true, status: finalized.scan.status, scan: finalized.scan, alreadyFinalized: true },
            resourceType: "face_scan",
            resourceId: finalized.scan.id,
          };
        }
        return {
          status: 202,
          reference: {
            ok: true,
            status: finalized.scan.status,
            scan: finalized.scan,
            quality: finalized.quality,
            analysis: { status: "queued_for_cloud", jobId: finalized.jobId },
          },
          resourceType: "face_scan",
          resourceId: finalized.scan.id,
        };
      },
    });
    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (
      error instanceof FaceAtlasScanNotFoundError ||
      (error instanceof Error && error.message === "faceatlas_scan_not_found")
    ) {
      return jsonError("faceatlas_scan_not_found", 404);
    }
    if (error instanceof FaceAtlasScanStateError) {
      return jsonError(error.reason, 409, { status: error.currentStatus });
    }
    if (error instanceof Error && error.message === "upload_not_authorized") {
      return jsonError(error.message, 409);
    }
    if (error instanceof FaceScanStorageError) {
      return jsonError(error.reason, 503);
    }
    if (
      error instanceof Error &&
      (error.message === "storage_not_configured" || error.message === "storage_unavailable")
    ) {
      return jsonError(error.message, 503);
    }
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    if (error instanceof Error && error.message === "idempotency_key_reused_with_different_payload") {
      return jsonError(error.message, 409);
    }
    if (error instanceof Error && error.message === "operation_in_progress") {
      return jsonError(error.message, 409);
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
