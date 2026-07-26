import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { recomputeGamificationState } from "@/lib/acnetrex/gamification/service";
import { executeIdempotent } from "@/lib/reliability/idempotency";

export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);
// Recompute takes no parameters — the state is derived entirely from the
// caller's persisted history. The body must still be a JSON object.
const recomputeRequestSchema = z.object({});

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 4 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = recomputeRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_gamification_recompute_payload", 400, parsed.error.issues);

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "gamification-recompute",
      key: idempotencyKey.data,
      method: "POST",
      route: "/api/gamification/recompute",
      payload: parsed.data,
      execute: async () => {
        const gamification = await recomputeGamificationState(auth.userId);
        return {
          status: 200,
          reference: { ok: true, gamification },
          resourceType: "gamification_state",
          resourceId: auth.userId,
        };
      },
    });
    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    if (error instanceof Error && ["operation_in_progress", "idempotency_key_reused_with_different_payload"].includes(error.message)) {
      return jsonError(error.message, 409);
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
