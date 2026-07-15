/**
 * GET  /api/notifications/preferences  — Read notification preferences
 * PATCH /api/notifications/preferences  — Update notification preferences
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

const prefPatchSchema = z.object({
  dailyReminder: z.boolean().optional(),
  dailyReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  streakAlerts: z.boolean().optional(),
  treatmentReminders: z.boolean().optional(),
  insightReady: z.boolean().optional(),
  reportReady: z.boolean().optional(),
}).strict();

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{
        daily_reminder: boolean;
        daily_reminder_time: string;
        streak_alerts: boolean;
        treatment_reminders: boolean;
        insight_ready: boolean;
        report_ready: boolean;
      }>(
        `SELECT daily_reminder, daily_reminder_time, streak_alerts,
                treatment_reminders, insight_ready, report_ready
           FROM public.notification_preferences
          WHERE user_id = $1::uuid
          LIMIT 1`,
        [auth.userId],
      );

      const prefs = rows[0];
      return NextResponse.json({
        ok: true,
        dailyReminder: prefs?.daily_reminder ?? true,
        dailyReminderTime: prefs?.daily_reminder_time ?? "20:00",
        streakAlerts: prefs?.streak_alerts ?? true,
        treatmentReminders: prefs?.treatment_reminders ?? true,
        insightReady: prefs?.insight_ready ?? true,
        reportReady: prefs?.report_ready ?? true,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({
        ok: true,
        dailyReminder: true,
        dailyReminderTime: "20:00",
        streakAlerts: true,
        treatmentReminders: true,
        insightReady: true,
        reportReady: true,
      });
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = await readJsonBodyLimited(request, 4_096);
  if (!body.ok) return jsonError("invalid_json_body", 400);

  const parsed = prefPatchSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid_preferences_payload", 400);

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) return jsonError("no_fields_to_update", 400);

  const setClauses: string[] = [];
  const values: unknown[] = [auth.userId];
  let idx = 2;

  if (updates.dailyReminder !== undefined) { setClauses.push(`daily_reminder = $${idx++}`); values.push(updates.dailyReminder); }
  if (updates.dailyReminderTime !== undefined) { setClauses.push(`daily_reminder_time = $${idx++}`); values.push(updates.dailyReminderTime); }
  if (updates.streakAlerts !== undefined) { setClauses.push(`streak_alerts = $${idx++}`); values.push(updates.streakAlerts); }
  if (updates.treatmentReminders !== undefined) { setClauses.push(`treatment_reminders = $${idx++}`); values.push(updates.treatmentReminders); }
  if (updates.insightReady !== undefined) { setClauses.push(`insight_ready = $${idx++}`); values.push(updates.insightReady); }
  if (updates.reportReady !== undefined) { setClauses.push(`report_ready = $${idx++}`); values.push(updates.reportReady); }

  setClauses.push(`updated_at = now()`);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Build column list for INSERT
      const colMap: Record<string, string> = {
        dailyReminder: "daily_reminder",
        dailyReminderTime: "daily_reminder_time",
        streakAlerts: "streak_alerts",
        treatmentReminders: "treatment_reminders",
        insightReady: "insight_ready",
        reportReady: "report_ready",
      };
      const updatedKeys = Object.keys(updates) as Array<keyof typeof updates>;
      const colNames = updatedKeys.map((k) => colMap[k]).join(", ");
      const colPlaceholders = updatedKeys.map((_, i) => `$${i + 2}`).join(", ");

      await client.query(
        `INSERT INTO public.notification_preferences (user_id, ${colNames})
         VALUES ($1::uuid, ${colPlaceholders})
         ON CONFLICT (user_id) DO UPDATE SET ${setClauses.join(", ")}`,
        values,
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
