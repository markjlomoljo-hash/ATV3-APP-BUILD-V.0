/**
 * GET /api/research/status
 *
 * Returns the user's research network enrollment status.
 * Zero-fabrication: cohort insights require real aggregated data.
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
      const { rows } = await client.query<{
        anonymous_learning: boolean;
        personal_learning: boolean;
      }>(
        `SELECT anonymous_learning, personal_learning
           FROM public.consents
          WHERE user_id = $1::uuid
          LIMIT 1`,
        [auth.userId],
      );

      const consent = rows[0];
      const anonymousLearningEnabled = consent?.anonymous_learning ?? false;

      return NextResponse.json({
        ok: true,
        enrolled: anonymousLearningEnabled,
        anonymousLearningEnabled,
        contributionCount: null,
        cohortInsights: [],
        lastContributionAt: null,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({
        ok: true,
        enrolled: false,
        anonymousLearningEnabled: false,
        contributionCount: null,
        cohortInsights: [],
        lastContributionAt: null,
      });
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
