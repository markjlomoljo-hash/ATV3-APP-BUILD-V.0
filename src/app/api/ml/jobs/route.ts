import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { enqueueMlAnalysisJob, mlAnalysisRequestSchema } from "@/lib/acnetrex/ml-analysis-jobs";

export const dynamic = "force-dynamic";

const operationKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

function requestId(request: Request): string {
  const value = request.headers.get("x-request-id");
  return operationKeySchema.safeParse(value).success ? value! : randomUUID();
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const idempotencyKey = request.headers.get("idempotency-key");
  const parsedKey = operationKeySchema.safeParse(idempotencyKey);
  if (!parsedKey.success) return jsonError("idempotency_key_required", 400);

  const body = await readJsonBodyLimited(request, 262_144);
  if (!body.ok) {
    return jsonError(body.error === "payload_too_large" ? "analysis_payload_too_large" : "invalid_json_body", body.error === "payload_too_large" ? 413 : 400);
  }

  const parsed = mlAnalysisRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_analysis_payload", 400, parsed.error.issues);

  try {
    // Fail at the boundary before any request can be reported as queued. The
    // database is the source of truth for jobs and outbox delivery.
    getDb();
    const correlationId = requestId(request);
    const result = await enqueueMlAnalysisJob({
      actorId: auth.userId,
      idempotencyKey: parsedKey.data,
      request: parsed.data,
      requestId: correlationId,
    });
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 202,
      headers: { "x-request-id": correlationId },
    });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    const message = error instanceof Error ? error.message : "database_query_failed";
    if (message === "operation_in_progress") return jsonError(message, 409);
    if (message === "idempotency_key_reused_with_different_payload") return jsonError(message, 409);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
