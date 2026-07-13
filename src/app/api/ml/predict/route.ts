import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { randomUUID } from "node:crypto";
import { hasPredictionPayload, isRecord } from "@/lib/acnetrex/ml-analysis-jobs";

export const dynamic = "force-dynamic";

const inputRecordRefSchema = z.object({
  table: z.string().min(1).max(80),
  id: z.string().min(1).max(160),
});

const predictionRequestSchema = z.object({
  engine: z.enum(["faceatlas", "sleepderm", "dermdiet", "triggergraph", "forecast", "skin_twin", "cutisai"]),
  operation: z.string().min(1).max(120),
  inputRecordRefs: z.array(inputRecordRefSchema).max(100).default([]),
  features: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const operationKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9._:-]+$/);

function mlApiBaseUrl(): string | null {
  return process.env.ACNETREX_ML_API_URL ?? null;
}

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

export async function POST(req: Request) {
  if (process.env.ML_PROXY_ENABLED !== "true") {
    return jsonError("ml_proxy_not_enabled", 503);
  }
  if (process.env.ML_PREDICTION_WORKER_ENABLED !== "true") {
    return jsonError("ml_proxy_requires_durable_worker", 503);
  }

  const auth = await authenticateSupabaseRequest(req);
  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const idempotencyKey = req.headers.get("idempotency-key");
  const parsedOperationKey = operationKeySchema.safeParse(idempotencyKey);
  if (!parsedOperationKey.success) {
    return jsonError("idempotency_key_required", 400);
  }
  const incomingRequestId = req.headers.get("x-request-id");
  const requestId = operationKeySchema.safeParse(incomingRequestId).success
    ? incomingRequestId!
    : randomUUID();

  const bodyResult = await readJsonBodyLimited(req, 262_144);
  if (!bodyResult.ok && bodyResult.error === "payload_too_large") {
    return jsonError("prediction_payload_too_large", 413);
  }
  if (!bodyResult.ok) return jsonError("invalid_json_body", 400);
  const body = bodyResult.value;

  const parsed = predictionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalid_prediction_payload", 400, parsed.error.issues);
  }

  const baseUrl = mlApiBaseUrl();
  if (!baseUrl) {
    return jsonError("ml_api_not_configured", 503);
  }

  const sharedSecret = process.env.ACNETREX_ML_SHARED_SECRET;
  if (!sharedSecret) {
    return jsonError("ml_service_auth_not_configured", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/predict`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${sharedSecret}`,
        "idempotency-key": parsedOperationKey.data,
        "x-request-id": requestId,
      },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;

    if (!payload) {
      return jsonError("ml_api_non_json_response", 503, { upstreamStatus: response.status });
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: payload?.error ?? "ml_api_unavailable",
          upstreamStatus: response.status,
        },
        { status: response.status === 400 ? 400 : 503 },
      );
    }

    if (!hasPredictionPayload(payload)) {
      return jsonError("ml_api_unexpected_response", 503, {
        upstreamStatus: response.status,
        receivedKeys: isRecord(payload) ? Object.keys(payload).sort() : [],
      });
    }

    return NextResponse.json(payload, {
      status: response.status,
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError" ? "ml_api_timeout" : "ml_api_unreachable";
    return jsonError(reason, 503);
  } finally {
    clearTimeout(timeout);
  }
}
