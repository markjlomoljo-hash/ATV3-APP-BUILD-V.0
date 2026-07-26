import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { getDailyLogKind } from "@/lib/acnetrex/daily-logs/kinds";
import { createDailyLogEntry, listDailyLogEntries } from "@/lib/acnetrex/daily-logs/service";
import { executeIdempotent } from "@/lib/reliability/idempotency";

export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);
const limitSchema = z.coerce.number().int().min(1).max(100);

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

type RouteContext = { params: Promise<{ kind: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const definition = getDailyLogKind((await context.params).kind);
  if (!definition) return jsonError("unknown_log_kind", 404);

  const rawLimit = new URL(request.url).searchParams.get("limit");
  const parsedLimit = rawLimit === null ? { success: true as const, data: 30 } : limitSchema.safeParse(rawLimit);
  if (!parsedLimit.success) return jsonError("invalid_limit", 400);

  try {
    const entries = await listDailyLogEntries(auth.userId, definition.slug, parsedLimit.data);
    return NextResponse.json({ ok: true, kind: definition.slug, table: definition.table, entries });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const definition = getDailyLogKind((await context.params).kind);
  if (!definition) return jsonError("unknown_log_kind", 404);

  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 64 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = definition.schema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_daily_log_payload", 400, parsed.error.issues);

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: `daily-log-${definition.slug}`,
      key: idempotencyKey.data,
      method: "POST",
      route: `/api/logs/${definition.slug}`,
      payload: parsed.data,
      execute: async (client) => {
        const entry = await createDailyLogEntry(client, auth.userId, definition.slug, parsed.data);
        return {
          status: 201,
          reference: { ok: true, kind: definition.slug, table: definition.table, entry },
          resourceType: definition.table,
          resourceId: entry.id,
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
