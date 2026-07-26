import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";
import { processMlAnalysisBatch } from "@/lib/acnetrex/ml-analysis-worker";

export const dynamic = "force-dynamic";

const MAX_WORKER_BATCH_JOBS = 10;

const workerRequestSchema = z.object({
  maxJobs: z.number().int().min(1).max(MAX_WORKER_BATCH_JOBS).default(1),
});

function secretMatches(expected: string, received: string | null): boolean {
  if (!received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

function receivedWorkerSecret(request: Request): string | null {
  const directSecret = request.headers.get("x-worker-secret");
  if (directSecret) return directSecret;
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

function isAuthorizedWorkerRequest(request: Request, expectedSecret: string): boolean {
  const received = receivedWorkerSecret(request);
  return secretMatches(expectedSecret, received) || secretMatches(process.env.CRON_SECRET?.trim() ?? "", received);
}

async function runWorker(request: Request, maxJobs: number) {
  const expectedSecret = process.env.ACNETREX_ML_WORKER_SECRET;
  if (process.env.ACNETREX_ML_WORKER_ENABLED !== "true" || !expectedSecret) {
    return NextResponse.json({ ok: false, error: "worker_not_configured" }, { status: 503 });
  }
  if (!isAuthorizedWorkerRequest(request, expectedSecret)) {
    return NextResponse.json({ ok: false, error: "worker_auth_required" }, { status: 401 });
  }

  try {
    const outcomes = await processMlAnalysisBatch({
      maxJobs,
      workerId: request.headers.get("x-worker-id") ?? undefined,
    });
    return NextResponse.json({ ok: true, outcomes });
  } catch {
    return NextResponse.json({ ok: false, error: "worker_database_unavailable" }, { status: 503 });
  }
}

/**
 * Vercel crons fire GET with no body, so the daily backstop cannot pass a
 * `maxJobs` payload. Drain the same bounded batch ceiling the POST contract
 * allows instead of a single job; the batch still stops early once the queue
 * is idle, and auth plus the `{ ok, outcomes }` response shape are unchanged.
 */
export async function GET(request: Request) {
  return runWorker(request, MAX_WORKER_BATCH_JOBS);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.ACNETREX_ML_WORKER_SECRET;
  if (process.env.ACNETREX_ML_WORKER_ENABLED !== "true" || !expectedSecret) {
    return NextResponse.json({ ok: false, error: "worker_not_configured" }, { status: 503 });
  }
  if (!isAuthorizedWorkerRequest(request, expectedSecret)) {
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
  return runWorker(request, parsed.data.maxJobs);
}
