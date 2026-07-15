/**
 * POST /api/notifications/mark-all-read
 *
 * Marks all unread notifications as read for the authenticated user.
 */
import { NextResponse } from "next/server";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { DatabaseConfigurationError, getPool } from "@/db";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE public.notifications
            SET read_at = now()
          WHERE user_id = $1::uuid AND read_at IS NULL`,
        [auth.userId],
      );
      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
