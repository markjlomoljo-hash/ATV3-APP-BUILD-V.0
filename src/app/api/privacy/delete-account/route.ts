/**
 * POST /api/privacy/delete-account
 *
 * Initiates a full account deletion job. The actual deletion is performed
 * asynchronously by the deletion worker.
 *
 * Requires: { confirmation: "DELETE" } in the request body.
 * Creates a deletion_requests row and triggers the deletion pipeline.
 * Zero-fabrication: no fake deletion — creates a real deletion_requests record.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { DatabaseConfigurationError, getPool } from "@/db";
import { readJsonBodyLimited } from "@/lib/http/read-json-body";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

const deleteSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = await readJsonBodyLimited(request, 4_096);
  if (!body.ok) return jsonError("invalid_json_body", 400);

  const parsed = deleteSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("confirmation_required", 400);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Check for existing pending deletion request
      const { rows: existing } = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM public.deletion_requests
          WHERE user_id = $1::uuid AND status IN ('pending', 'processing')
          LIMIT 1`,
        [auth.userId],
      );

      if (existing.length > 0) {
        return NextResponse.json({
          ok: true,
          deletionRequestId: existing[0].id,
          status: existing[0].status,
          message: "Deletion already in progress.",
        });
      }

      // Create deletion request
      const { rows: created } = await client.query<{ id: string }>(
        `INSERT INTO public.deletion_requests (user_id, status, requested_at)
         VALUES ($1::uuid, 'pending', now())
         RETURNING id`,
        [auth.userId],
      );

      const deletionRequestId = created[0].id;

      // Audit (non-blocking)
      client.query(
        `INSERT INTO public.deletion_audit_events (user_id, event_type, deletion_request_id, created_at)
         VALUES ($1::uuid, 'deletion_requested', $2::uuid, now())`,
        [auth.userId, deletionRequestId],
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        deletionRequestId,
        status: "pending",
        message: "Account deletion initiated. All data will be permanently removed within 24 hours.",
      }, { status: 202 });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
