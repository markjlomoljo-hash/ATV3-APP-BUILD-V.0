import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError, getDb } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { cutisAiMessageSchema } from "@/lib/acnetrex/modules/schemas";
import {
  CutisAiConsentRequiredError,
  listCutisAiConversations,
  recordCutisAiMessage,
} from "@/lib/acnetrex/memory/conversations";
import { executeIdempotent } from "@/lib/reliability/idempotency";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

export const dynamic = "force-dynamic";

const operationKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function errorResponse(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const conversations = await listCutisAiConversations(auth.userId);
    return NextResponse.json({ ok: true, conversations });
  } catch (error) {
    if (error instanceof CutisAiConsentRequiredError) return errorResponse("consent_required", 403);
    if (error instanceof DatabaseConfigurationError) return errorResponse("database_unavailable", 503);
    return errorResponse(classifyDatabaseFailure(error), 503);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  const idempotencyKey = operationKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) return errorResponse("idempotency_key_required", 400);

  const body = await readJsonBodyLimited(request, 262_144);
  if (!body.ok) {
    return errorResponse(
      body.error === "payload_too_large" ? "message_payload_too_large" : "invalid_json_body",
      body.error === "payload_too_large" ? 413 : 400,
    );
  }

  const parsed = cutisAiMessageSchema.safeParse(body.value);
  if (!parsed.success) return errorResponse("invalid_message_payload", 400, parsed.error.issues);

  try {
    getDb();
    const result = await executeIdempotent({
      actorId: auth.userId,
      scope: "cutisai.conversations",
      key: idempotencyKey.data,
      method: "POST",
      route: "/api/cutisai/conversations",
      payload: parsed.data,
      execute: async (client) => {
        const recorded = await recordCutisAiMessage(client, auth.userId, parsed.data);
        const reference = {
          ok: true,
          conversation: recorded.conversation,
          message: recorded.message,
          assistant: {
            status: "not_configured",
            error: "assistant_generation_not_configured",
            runtimeMode: "not_configured",
            evidence: "evidence_unavailable",
          },
        };
        return {
          status: 201,
          reference,
          resourceType: "cutisai_conversation",
          resourceId: recorded.conversation.id,
        };
      },
    });

    return NextResponse.json({ ...result.reference, replayed: result.replayed }, { status: result.status });
  } catch (error) {
    if (error instanceof CutisAiConsentRequiredError) return errorResponse("consent_required", 403);
    if (error instanceof DatabaseConfigurationError) return errorResponse("database_unavailable", 503);
    const message = error instanceof Error ? error.message : "database_query_failed";
    if (message === "operation_in_progress") return errorResponse(message, 409);
    if (message === "idempotency_key_reused_with_different_payload") return errorResponse(message, 409);
    return errorResponse(classifyDatabaseFailure(error), 503);
  }
}
