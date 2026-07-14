import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb, getPool } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import {
  FaceAtlasScanNotFoundError,
  createFaceAtlasAnnotation,
  faceAtlasAnnotationRequestSchema,
  getFaceAtlasScan,
} from "@/lib/acnetrex/faceatlas/scans";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const body = await readJsonBodyLimited(request, 64 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = faceAtlasAnnotationRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_faceatlas_annotation_payload", 400, parsed.error.issues);
  try {
    getDb();
    const client = await getPool().connect();
    try {
      await client.query("begin");
      const annotation = await createFaceAtlasAnnotation(client, auth.userId, parsed.data);
      await client.query("commit");
      return NextResponse.json({ ok: true, annotation, analysis: { status: "not_configured", result: null } }, { status: 201 });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof FaceAtlasScanNotFoundError) return jsonError("faceatlas_scan_not_found", 404);
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const scanId = new URL(request.url).searchParams.get("scanId");
  const parsedScanId = z.string().uuid().safeParse(scanId);
  if (!parsedScanId.success) return jsonError("invalid_scan_id", 400);
  try {
    const result = await getFaceAtlasScan(auth.userId, parsedScanId.data);
    return NextResponse.json({ ok: true, annotations: result.annotations });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
