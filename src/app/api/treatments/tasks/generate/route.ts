import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { generateTreatmentTasks, taskGenerationRequestSchema } from "@/lib/acnetrex/treatment/task-generation";
import { executeIdempotent } from "@/lib/reliability/idempotency";

export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 16 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = taskGenerationRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_task_generation_payload", 400, parsed.error.issues);

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "treatment-task-generation",
      key: idempotencyKey.data,
      method: "POST",
      route: "/api/treatments/tasks/generate",
      payload: parsed.data,
      execute: async () => {
        const generation = await generateTreatmentTasks(auth.userId, parsed.data);
        return {
          status: generation.status === "generated" ? 201 : 200,
          reference: { ok: true, generation },
          resourceType: "treatment_task_generation",
        };
      },
    });
    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    if (error instanceof Error && error.message === "treatment_plan_not_found") return jsonError(error.message, 404);
    if (error instanceof Error && ["operation_in_progress", "idempotency_key_reused_with_different_payload"].includes(error.message)) {
      return jsonError(error.message, 409);
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
