import { NextResponse } from "next/server";
import { z } from "zod";

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

function mlApiBaseUrl(): string | null {
  return process.env.ACNETREX_ML_API_URL ?? process.env.NEXT_PUBLIC_ACNETREX_ML_API_URL ?? null;
}

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasPredictionPayload(payload: unknown): payload is Record<string, unknown> {
  if (!isRecord(payload)) {
    return false;
  }

  if (Array.isArray(payload.predictions)) {
    return true;
  }

  if ("prediction" in payload) {
    return true;
  }

  return payload.ok === true && ("predictions" in payload || "prediction" in payload || "result" in payload);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json_body", 400);
  }

  const parsed = predictionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalid_prediction_payload", 400, parsed.error.issues);
  }

  const baseUrl = mlApiBaseUrl();
  if (!baseUrl) {
    return jsonError("ml_api_not_configured", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/predict`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json() : null;

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

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError" ? "ml_api_timeout" : "ml_api_unreachable";
    return jsonError(reason, 503);
  } finally {
    clearTimeout(timeout);
  }
}
