import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError } from "@/db";
import {
  canonicalConsentPatchSchema,
  getCanonicalConsent,
  updateCanonicalConsent,
} from "@/lib/acnetrex/consents";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

export const dynamic = "force-dynamic";

const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function databaseError(error: unknown) {
  if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
  const message = error instanceof Error ? error.message : "database_query_failed";
  if (message === "operation_in_progress" || message === "idempotency_key_reused_with_different_payload") {
    return jsonError(message, 409);
  }
  return jsonError(classifyDatabaseFailure(error), 503);
}

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  try {
    const consent = await getCanonicalConsent(auth.userId);
    return NextResponse.json({ ok: true, consent });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const parsedKey = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!parsedKey.success) return jsonError("idempotency_key_required", 400);

  const body = await readJsonBodyLimited(request, 16_384);
  if (!body.ok) return jsonError(body.error === "payload_too_large" ? "consent_payload_too_large" : "invalid_json_body", body.error === "payload_too_large" ? 413 : 400);
  const parsed = canonicalConsentPatchSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_consent_payload", 400);

  try {
    const result = await updateCanonicalConsent({
      actorId: auth.userId,
      idempotencyKey: parsedKey.data,
      patch: parsed.data,
    });
    return NextResponse.json({ ok: true, consent: result.consent, replayed: result.replayed });
  } catch (error) {
    return databaseError(error);
  }
}
