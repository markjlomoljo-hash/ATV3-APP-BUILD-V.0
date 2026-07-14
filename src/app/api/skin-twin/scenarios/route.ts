import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import {
  SkinTwinConsentRequiredError,
  createSkinTwinScenario,
  listSkinTwinScenarios,
  skinTwinScenarioRequestSchema,
} from "@/lib/acnetrex/skin-twin/scenarios";
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
    return NextResponse.json({ ok: true, scenarios: await listSkinTwinScenarios(auth.userId) });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const key = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!key.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 64 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = skinTwinScenarioRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_skin_twin_scenario_payload", 400, parsed.error.issues);
  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "skin-twin-scenario",
      key: key.data,
      method: "POST",
      route: "/api/skin-twin/scenarios",
      payload: parsed.data,
      execute: async (client) => {
        const created = await createSkinTwinScenario(client, auth.userId, parsed.data);
        return {
          status: created.status === "queued_for_cloud" ? 202 : 201,
          reference: {
            ok: true,
            status: created.status,
            snapshot: created.snapshot,
            projection: null,
            projectionStatus: created.status === "queued_for_cloud" ? "queued_for_cloud" : "insufficient_data",
          },
          resourceType: "skin_twin_snapshot",
          resourceId: created.snapshot.id,
        };
      },
    });
    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (error instanceof SkinTwinConsentRequiredError || (error instanceof Error && error.message === "personal_learning_consent_required")) return jsonError("consent_required", 403);
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    if (error instanceof Error && ["operation_in_progress", "idempotency_key_reused_with_different_payload"].includes(error.message)) return jsonError(error.message, 409);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
