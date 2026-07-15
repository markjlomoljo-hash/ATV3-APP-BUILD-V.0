/**
 * GET /api/intelligence/status
 *
 * Returns the current state of the intelligence layer for the authenticated user.
 * Zero-fabrication: all engine statuses come from real ml_analysis_jobs rows.
 * If the ML service is not configured, returns a structured not_configured response.
 */
import { NextResponse } from "next/server";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { DatabaseConfigurationError, getPool } from "@/db";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

const ENGINE_OPERATIONS = [
  { name: "TriggerGraph", operation: "trigger_correlation" },
  { name: "ClearPath Forecast", operation: "clearpath_forecast" },
  { name: "Skin Twin", operation: "skin_twin_match" },
  { name: "BarrierGuard", operation: "barrier_assessment" },
  { name: "Acne Signature", operation: "acne_signature" },
];

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const { rows: jobs } = await client.query<{
        id: string;
        operation: string;
        status: string;
        model_version: string | null;
        created_at: string;
        completed_at: string | null;
      }>(
        `SELECT id, operation, status, model_version, created_at, completed_at
           FROM public.ml_analysis_jobs
          WHERE user_id = $1::uuid
          ORDER BY created_at DESC
          LIMIT 50`,
        [auth.userId],
      );

      // Build per-engine status from most recent job per operation
      const latestByOperation = new Map<string, typeof jobs[0]>();
      for (const job of jobs) {
        if (!latestByOperation.has(job.operation)) {
          latestByOperation.set(job.operation, job);
        }
      }

      const engines = ENGINE_OPERATIONS.map(({ name, operation }) => {
        const job = latestByOperation.get(operation);
        if (!job) {
          return { name, status: "not_configured", modelVersion: null, lastRunAt: null, coverage: null };
        }
        return {
          name,
          status: job.status,
          modelVersion: job.model_version ?? null,
          lastRunAt: job.completed_at ?? job.created_at ?? null,
          coverage: null,
        };
      });

      const statuses = engines.map((e) => e.status);
      const overallStatus = statuses.every((s) => s === "not_configured")
        ? "not_configured"
        : statuses.some((s) => s === "completed")
        ? statuses.every((s) => s === "completed" || s === "not_configured")
          ? "ready"
          : "partial"
        : "partial";

      const recentJobs = jobs.slice(0, 10).map((j) => ({
        id: j.id,
        operation: j.operation,
        status: j.status,
        createdAt: j.created_at,
      }));

      return NextResponse.json({ ok: true, overallStatus, engines, recentJobs });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({
        ok: true,
        overallStatus: "not_configured",
        engines: ENGINE_OPERATIONS.map(({ name }) => ({
          name, status: "not_configured", modelVersion: null, lastRunAt: null, coverage: null,
        })),
        recentJobs: [],
      });
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
