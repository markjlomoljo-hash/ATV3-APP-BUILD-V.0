import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { processMlAnalysisBatch } from "@/lib/acnetrex/ml-analysis-worker";

export const dynamic = "force-dynamic";

const workerRequestSchema = z.object({ maxJobs: z.number().int().min(1).max(10).default(1) });

function secretMatches(expected: string, received: string | null): boolean {
  if (!received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.ACNETREX_ML_WORKER_SECRET;
  if (process.env.ACNETREX_ML_WORKER_ENABLED !== "true" || !expectedSecret) {
    return NextResponse.json({ ok: false, error: "worker_not_configured" }, { status: 503 });
  }
  if (!secretMatches(expectedSecret, request.headers.get("x-worker-secret"))) {
    return NextResponse.json({ ok: false, error: "worker_auth_required" }, { status: 401 });
  }

  const body = await readJsonBodyLimited(request, 8_192);
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error === "payload_too_large" ? "worker_payload_too_large" : "invalid_json_body" },
      { status: body.error === "payload_too_large" ? 413 : 400 },
    );
  }
  const parsed = workerRequestSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_worker_payload" }, { status: 400 });

  try {
    const outcomes = await processMlAnalysisBatch({
      maxJobs: parsed.data.maxJobs,
      workerId: request.headers.get("x-worker-id") ?? undefined,
    });
    return NextResponse.json({ ok: true, outcomes });
  } catch {
    return NextResponse.json({ ok: false, error: "worker_database_unavailable" }, { status: 503 });
  }
}
