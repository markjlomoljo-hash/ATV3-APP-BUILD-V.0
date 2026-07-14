import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import {
  TreatmentSafetyError,
  createTreatmentPlan,
  listTreatmentPlans,
  treatmentPlanRequestSchema,
} from "@/lib/acnetrex/treatment/plans";
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
    return NextResponse.json({ ok: true, plans: await listTreatmentPlans(auth.userId) });
  } catch (error) {
    const reason = error instanceof DatabaseConfigurationError ? "database_unavailable" : classifyDatabaseFailure(error);
    return jsonError(reason, 503);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 64 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = treatmentPlanRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_treatment_plan_payload", 400, parsed.error.issues);

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "treatment-plan",
      key: idempotencyKey.data,
      method: "POST",
      route: "/api/treatments/plans",
      payload: parsed.data,
      execute: async () => {
        const plan = await createTreatmentPlan(auth.userId, parsed.data);
        return {
          status: 201,
          reference: { ok: true, plan },
          resourceType: "treatment_plan",
          resourceId: plan.id,
        };
      },
    });
    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (error instanceof TreatmentSafetyError) return jsonError("provider_directed_treatment_required", 422);
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    if (error instanceof Error && ["operation_in_progress", "idempotency_key_reused_with_different_payload"].includes(error.message)) return jsonError(error.message, 409);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
