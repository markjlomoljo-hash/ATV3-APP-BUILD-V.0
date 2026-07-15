import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError } from "@/db";
import {
  DeletionRequestError,
  createDeletionRequest,
  deletionRequestInputSchema,
} from "@/lib/acnetrex/deletion-requests";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function deletionError(error: unknown) {
  if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
  if (error instanceof DeletionRequestError) {
    if (error.code === "recent_authentication_required") return jsonError(error.code, 403);
    if (error.code === "active_deletion_request_exists") return jsonError(error.code, 409);
    return jsonError(error.code, 409);
  }
  if (error instanceof Error && [
    "operation_in_progress",
    "idempotency_key_reused_with_different_payload",
  ].includes(error.message)) {
    return jsonError(error.message, 409);
  }
  return jsonError(classifyDatabaseFailure(error), 503);
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);

  const body = await readJsonBodyLimited(request, 16_384);
  if (!body.ok) {
    return jsonError(
      body.error === "payload_too_large" ? "deletion_payload_too_large" : "invalid_json_body",
      body.error === "payload_too_large" ? 413 : 400,
    );
  }
  const parsed = deletionRequestInputSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_deletion_request", 400);

  try {
    const result = await createDeletionRequest({
      actorId: auth.userId,
      idempotencyKey: idempotencyKey.data,
      input: parsed.data,
    });
    return NextResponse.json(
      { ok: true, request: result.request, replayed: result.replayed },
      {
        status: 201,
        headers: { location: `/api/deletions/${result.request.id}` },
      },
    );
  } catch (error) {
    return deletionError(error);
  }
}
