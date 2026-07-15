/**
 * GET /api/forecast/latest
 *
 * Returns the latest ClearPath forecast for the authenticated user.
 * Zero-fabrication: returns null if no forecast exists.
 */
import { NextResponse } from "next/server";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { DatabaseConfigurationError, getPool } from "@/db";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const [forecastResult, summaryResult] = await Promise.all([
        client.query(
          `SELECT * FROM public.forecasts
            WHERE user_id = $1::uuid
            ORDER BY generated_at DESC
            LIMIT 1`,
          [auth.userId],
        ),
        client.query(
          `SELECT * FROM public.forecast_summaries
            WHERE user_id = $1::uuid
            ORDER BY generated_at DESC
            LIMIT 1`,
          [auth.userId],
        ),
      ]);

      const forecast = forecastResult.rows[0] ?? null;
      const summary = summaryResult.rows[0] ?? null;

      return NextResponse.json({
        ok: true,
        forecast,
        summary,
        dataNote: forecast
          ? null
          : "No forecast available yet. Forecasts are generated after sufficient logging history and ML configuration.",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({
        ok: true,
        forecast: null,
        summary: null,
        dataNote: "Intelligence layer not yet configured.",
      });
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
