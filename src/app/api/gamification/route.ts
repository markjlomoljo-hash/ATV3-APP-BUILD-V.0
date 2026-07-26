import { NextResponse } from "next/server";
import { DatabaseConfigurationError } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { getGamificationState } from "@/lib/acnetrex/gamification/service";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

/**
 * Read-only canonical gamification state. Serves only persisted state written
 * by the server-side recompute rules; an untouched account honestly reports
 * status "insufficient_data" with zero progress.
 */
export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  try {
    return NextResponse.json({ ok: true, gamification: await getGamificationState(auth.userId) });
  } catch (error) {
    const reason = error instanceof DatabaseConfigurationError ? "database_unavailable" : classifyDatabaseFailure(error);
    return jsonError(reason, 503);
  }
}
