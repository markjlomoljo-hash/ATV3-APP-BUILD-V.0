/**
 * GET /api/patterns/summary
 *
 * Returns trigger hypotheses and the latest forecast for the authenticated user.
 * Zero-fabrication: all data comes from real database rows.
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
      const [hypothesesResult, forecastResult] = await Promise.all([
        client.query<{
          id: string;
          trigger_type: string;
          trigger_name: string;
          confidence: number | null;
          status: string;
          evidence_summary: string | null;
          created_at: string;
          updated_at: string;
        }>(
          `SELECT id, trigger_type, trigger_name, confidence, status, evidence_summary, created_at, updated_at
             FROM public.trigger_hypotheses
            WHERE user_id = $1::uuid
            ORDER BY confidence DESC NULLS LAST
            LIMIT 20`,
          [auth.userId],
        ),
        client.query<{
          id: string;
          forecast_date: string;
          predicted_severity: number | null;
          confidence_interval: unknown;
          model_version: string | null;
          generated_at: string;
          expires_at: string | null;
        }>(
          `SELECT id, forecast_date, predicted_severity, confidence_interval, model_version, generated_at, expires_at
             FROM public.forecasts
            WHERE user_id = $1::uuid
            ORDER BY generated_at DESC
            LIMIT 1`,
          [auth.userId],
        ),
      ]);

      return NextResponse.json({
        ok: true,
        triggerHypotheses: hypothesesResult.rows,
        latestForecast: forecastResult.rows[0] ?? null,
        dataNote:
          "All patterns are derived from your logged data. Correlations require minimum data thresholds before appearing.",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({
        ok: true,
        triggerHypotheses: [],
        latestForecast: null,
        dataNote: "Intelligence layer not yet configured.",
      });
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
