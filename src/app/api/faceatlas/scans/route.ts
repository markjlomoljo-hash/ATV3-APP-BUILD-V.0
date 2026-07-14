import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import {
  FaceAtlasConsentRequiredError,
  createFaceAtlasScan,
  faceAtlasScanRequestSchema,
  listFaceAtlasScans,
} from "@/lib/acnetrex/faceatlas/scans";
import { executeIdempotent } from "@/lib/reliability/idempotency";

export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}
export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  try {
    const scans = await listFaceAtlasScans(auth.userId);
    return NextResponse.json({ ok: true, scans });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 64 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = faceAtlasScanRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_faceatlas_scan_payload", 400, parsed.error.issues);

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "faceatlas-scan",
      key: idempotencyKey.data,
      method: "POST",
      route: "/api/faceatlas/scans",
      payload: parsed.data,
      execute: async (client) => {
        const created = await createFaceAtlasScan(client, auth.userId, parsed.data);
        return {
          status: 202,
          reference: { ok: true, status: created.status, scan: created.scan, analysis: { status: "pending_upload", result: null } },
          resourceType: "face_scan",
          resourceId: created.scan.id,
        };
      },
    });
    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (error instanceof FaceAtlasConsentRequiredError || (error instanceof Error && error.message === "raw_image_retention_consent_required")) {
      return jsonError("consent_required", 403);
    }
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    if (error instanceof Error && error.message === "idempotency_key_reused_with_different_payload") return jsonError(error.message, 409);
    if (error instanceof Error && error.message === "operation_in_progress") return jsonError(error.message, 409);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}

