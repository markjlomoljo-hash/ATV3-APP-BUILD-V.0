/**
 * POST /api/privacy/export
 *
 * Initiates a data export job. The actual export is performed asynchronously.
 * Creates an export_requests row and returns the request ID.
 * Zero-fabrication: no fake export — creates a real export_requests record.
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
      // Check for existing pending export
      const { rows: existing } = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM public.export_requests
          WHERE user_id = $1::uuid AND status IN ('pending', 'processing')
          ORDER BY created_at DESC
          LIMIT 1`,
        [auth.userId],
      );

      if (existing.length > 0) {
        return NextResponse.json({
          ok: true,
          exportRequestId: existing[0].id,
          status: existing[0].status,
          message: "Export already in progress.",
        });
      }

      const { rows: created } = await client.query<{ id: string }>(
        `INSERT INTO public.export_requests (user_id, status, format, include_images, created_at)
         VALUES ($1::uuid, 'pending', 'json', false, now())
         RETURNING id`,
        [auth.userId],
      );

      return NextResponse.json({
        ok: true,
        exportRequestId: created[0].id,
        status: "pending",
        message: "Data export initiated. You will receive a download link when ready.",
      }, { status: 202 });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
