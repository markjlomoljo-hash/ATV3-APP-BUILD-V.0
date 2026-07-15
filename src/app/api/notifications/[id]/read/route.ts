/**
 * POST /api/notifications/[id]/read
 *
 * Marks a specific notification as read for the authenticated user.
 */
import { NextResponse } from "next/server";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { DatabaseConfigurationError, getPool } from "@/db";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  if (!id || typeof id !== "string") return jsonError("invalid_notification_id", 400);

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return jsonError("invalid_notification_id", 400);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE public.notifications
            SET read_at = now()
          WHERE id = $1::uuid AND user_id = $2::uuid AND read_at IS NULL`,
        [id, auth.userId],
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
