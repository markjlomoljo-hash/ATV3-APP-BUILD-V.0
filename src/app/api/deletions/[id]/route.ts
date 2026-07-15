import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError } from "@/db";
import {
  DeletionRequestError,
  cancelDeletionRequest,
  getDeletionRequest,
} from "@/lib/acnetrex/deletion-requests";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

export const dynamic = "force-dynamic";

const requestIdSchema = z.string().uuid();
const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function deletionError(error: unknown) {
  if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
  if (error instanceof DeletionRequestError) {
    if (error.code === "deletion_request_not_found") return jsonError(error.code, 404);
    if (error.code === "recent_authentication_required") return jsonError(error.code, 403);
    if ([
      "deletion_cancellation_window_closed",
      "deletion_state_changed",
      "deletion_delivery_state_missing",
    ].includes(error.code)) {
      return jsonError(error.code, 409);
    }
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const requestId = requestIdSchema.safeParse((await context.params).id);
  if (!requestId.success) return jsonError("invalid_deletion_request_id", 400);

  try {
    const deletion = await getDeletionRequest({ actorId: auth.userId, requestId: requestId.data });
    if (!deletion) return jsonError("deletion_request_not_found", 404);
    return NextResponse.json({ ok: true, request: deletion });
  } catch (error) {
    return deletionError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const requestId = requestIdSchema.safeParse((await context.params).id);
  if (!requestId.success) return jsonError("invalid_deletion_request_id", 400);
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);

  try {
    const result = await cancelDeletionRequest({
      actorId: auth.userId,
      requestId: requestId.data,
      idempotencyKey: idempotencyKey.data,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return deletionError(error);
  }
}
