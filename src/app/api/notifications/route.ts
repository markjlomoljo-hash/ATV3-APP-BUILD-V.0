/**
 * GET /api/notifications
 *
 * Returns the authenticated user's notification inbox.
 * Supports ?limit=N and ?unread_only=true query params.
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

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);
  const unreadOnly = url.searchParams.get("unread_only") === "true";

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const unreadClause = unreadOnly ? "AND read_at IS NULL" : "";
      const { rows } = await client.query<{
        id: string;
        kind: string;
        title: string;
        body: string;
        read_at: string | null;
        created_at: string;
      }>(
        `SELECT id, kind, title, body, read_at, created_at
           FROM public.notifications
          WHERE user_id = $1::uuid ${unreadClause}
          ORDER BY created_at DESC
          LIMIT $2`,
        [auth.userId, limit],
      );

      const notifications = rows.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        readAt: n.read_at,
        createdAt: n.created_at,
      }));

      return NextResponse.json({ ok: true, notifications });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ ok: true, notifications: [] });
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
