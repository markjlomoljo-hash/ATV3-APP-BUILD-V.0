/**
 * GET  /api/privacy/consent  — Read current consent settings
 * PATCH /api/privacy/consent  — Update one or more consent flags
 *
 * All consent changes are written to the consents table and audited
 * via consent_audit_events. No fake toggles — real pg writes.
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

const consentPatchSchema = z.object({
  personalLearning: z.boolean().optional(),
  anonymousLearning: z.boolean().optional(),
  rawImageStorage: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  cycleContext: z.boolean().optional(),
  exportEnabled: z.boolean().optional(),
}).strict();

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{
        personal_learning: boolean;
        anonymous_learning: boolean;
        raw_image_storage: boolean;
        notifications_enabled: boolean;
        cycle_context: boolean;
        export_enabled: boolean;
      }>(
        `SELECT personal_learning, anonymous_learning, raw_image_storage,
                notifications_enabled, cycle_context, export_enabled
           FROM public.consents
          WHERE user_id = $1::uuid
          LIMIT 1`,
        [auth.userId],
      );

      const consent = rows[0];
      return NextResponse.json({
        ok: true,
        personalLearning: consent?.personal_learning ?? false,
        anonymousLearning: consent?.anonymous_learning ?? false,
        rawImageStorage: consent?.raw_image_storage ?? true,
        notificationsEnabled: consent?.notifications_enabled ?? true,
        cycleContext: consent?.cycle_context ?? false,
        exportEnabled: consent?.export_enabled ?? true,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = await readJsonBodyLimited(request, 4_096);
  if (!body.ok) return jsonError("invalid_json_body", 400);

  const parsed = consentPatchSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_consent_payload", 400);

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) return jsonError("no_fields_to_update", 400);

  // Build explicit SET clause — only include fields that are present
  const setClauses: string[] = [];
  const values: unknown[] = [auth.userId];
  let idx = 2;

  if (updates.personalLearning !== undefined) {
    setClauses.push(`personal_learning = $${idx++}`);
    values.push(updates.personalLearning);
  }
  if (updates.anonymousLearning !== undefined) {
    setClauses.push(`anonymous_learning = $${idx++}`);
    values.push(updates.anonymousLearning);
  }
  if (updates.rawImageStorage !== undefined) {
    setClauses.push(`raw_image_storage = $${idx++}`);
    values.push(updates.rawImageStorage);
  }
  if (updates.notificationsEnabled !== undefined) {
    setClauses.push(`notifications_enabled = $${idx++}`);
    values.push(updates.notificationsEnabled);
  }
  if (updates.cycleContext !== undefined) {
    setClauses.push(`cycle_context = $${idx++}`);
    values.push(updates.cycleContext);
  }
  if (updates.exportEnabled !== undefined) {
    setClauses.push(`export_enabled = $${idx++}`);
    values.push(updates.exportEnabled);
  }

  // Always update the timestamp
  setClauses.push(`updated_at = now()`);

  // Use UPSERT: insert if no row exists, update if it does
  const updateSql = `
    INSERT INTO public.consents (user_id, ${setClauses
      .filter((c) => !c.startsWith("updated_at"))
      .map((c) => c.split(" = ")[0].trim())
      .join(", ")}, updated_at)
    VALUES ($1::uuid, ${values.slice(1).map((_, i) => `$${i + 2}`).join(", ")}, now())
    ON CONFLICT (user_id) DO UPDATE SET ${setClauses.join(", ")}
  `;

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query(updateSql, values);

      // Audit log (non-blocking — do not await)
      void client.query(
        `INSERT INTO public.consent_audit_events (user_id, event_type, changes, created_at)
         VALUES ($1::uuid, 'consent_updated', $2::jsonb, now())`,
        [auth.userId, JSON.stringify(updates)],
      ).catch(() => undefined);

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
