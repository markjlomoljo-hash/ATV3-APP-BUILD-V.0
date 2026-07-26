import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { FaceAtlasScanNotFoundError } from "@/lib/acnetrex/faceatlas/scans";
import {
  FaceAtlasScanStateError,
  FaceAtlasUploadConsentError,
  authorizeFaceScanUpload,
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

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "faceatlas-upload-authorization",
      key: idempotencyKey.data,
      method: "POST",
      route: "/api/faceatlas/scans/[id]/upload",
      payload: { scanId: id },
      execute: async (client) => {
        const authorization = await authorizeFaceScanUpload(client, auth.userId, id);
        return {
          status: 200,
          reference: {
            ok: true,
            status: authorization.scan.status,
            scan: authorization.scan,
            upload: authorization.upload,
          },
          resourceType: "face_scan",
          resourceId: authorization.scan.id,
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
    if (
      error instanceof FaceAtlasUploadConsentError ||
      (error instanceof Error && error.message === "raw_image_consent_required")
    ) {
      const missing = error instanceof FaceAtlasUploadConsentError ? error.missing : undefined;
      return jsonError("consent_required", 403, missing ? { missing } : undefined);
    }
    if (error instanceof FaceAtlasScanStateError) {
      return jsonError(error.reason, 409, { status: error.currentStatus });
    }
    if (error instanceof Error && error.message === "scan_not_awaiting_upload") {
      return jsonError(error.message, 409);
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
