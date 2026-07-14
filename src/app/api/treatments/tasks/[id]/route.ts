import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { completeTreatmentTask, treatmentTaskCompletionSchema } from "@/lib/acnetrex/treatment/tasks";
import { executeIdempotent } from "@/lib/reliability/idempotency";

export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);
const taskIdSchema = z.string().uuid();

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const taskId = taskIdSchema.safeParse((await context.params).id);
  if (!taskId.success) return jsonError("invalid_task_id", 400);
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return jsonError("idempotency_key_required", 400);
  const body = await readJsonBodyLimited(request, 16 * 1024);
  if (!body.ok) return jsonError(body.error, body.error === "payload_too_large" ? 413 : 400);
  const parsed = treatmentTaskCompletionSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_treatment_task_completion_payload", 400, parsed.error.issues);

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "treatment-task-completion",
      key: idempotencyKey.data,
      method: "PATCH",
      route: `/api/treatments/tasks/${taskId.data}`,
      payload: parsed.data,
      execute: async () => {
        const task = await completeTreatmentTask(auth.userId, taskId.data, parsed.data);
        return { status: 200, reference: { ok: true, task }, resourceType: "treatment_task", resourceId: task.id };
      },
    });
    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    if (error instanceof Error && error.message === "treatment_task_not_found") return jsonError(error.message, 404);
    if (error instanceof Error && ["operation_in_progress", "idempotency_key_reused_with_different_payload"].includes(error.message)) {
      return jsonError(error.message, 409);
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
