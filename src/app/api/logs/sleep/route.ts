import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db";
import { withSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sleepInputSchema = z.object({
  log_date: dateSchema,
  sleep_time: z.string().datetime().nullable().optional(),
  wake_time: z.string().datetime().nullable().optional(),
  quality: z.number().int().min(1).max(5).nullable().optional(),
  disturbances: z.array(z.object({
    time: z.string().max(50).optional(),
    reason: z.string().max(300).optional(),
    duration_minutes: z.number().min(0).max(1440).optional(),
  })).nullable().optional(),
  naps: z.array(z.object({
    start_time: z.string().max(50).optional(),
    end_time: z.string().max(50).optional(),
    duration_minutes: z.number().min(0).max(1440).optional(),
    quality: z.number().int().min(1).max(5).optional(),
  })).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  manual_duration_override: z.number().int().min(1).max(1440).nullable().optional(),
  manual_duration_reason: z.string().trim().min(1).max(500).nullable().optional(),
  working_sleep_target: z.number().min(4).max(14).nullable().optional(),
  target_sleep_range: z.tuple([z.number().min(4).max(14), z.number().min(4).max(14)]).nullable().optional(),
  target_source: z.enum(["age_default", "user_selected", "wearable_estimated", "clinician_entered"]).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
  schedule_context: z.string().max(500).nullable().optional(),
}).superRefine((value, context) => {
  if (value.manual_duration_override != null && !value.manual_duration_reason) {
    context.addIssue({ code: "custom", path: ["manual_duration_reason"], message: "Override reason required" });
  }
  if (value.target_sleep_range && value.target_sleep_range[0] > value.target_sleep_range[1]) {
    context.addIssue({ code: "custom", path: ["target_sleep_range"], message: "Target range is reversed" });
  }
});

export const GET = withSession(async (request: NextRequest, { userId }) => {
  const date = request.nextUrl.searchParams.get("date");
  if (date) {
    if (!dateSchema.safeParse(date).success) {
      return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
    }
    const result = await getPool().query(
      `select * from public.sleep_logs where user_id = $1::uuid and log_date = $2::date limit 1`,
      [userId, date],
    );
    return NextResponse.json({ ok: true, log: result.rows[0] ?? null });
  }

  const parsedLimit = z.coerce.number().int().min(1).max(365).safeParse(
    request.nextUrl.searchParams.get("limit") ?? "30",
  );
  const parsedOffset = z.coerce.number().int().min(0).max(3650).safeParse(
    request.nextUrl.searchParams.get("offset") ?? "0",
  );
  if (!parsedLimit.success || !parsedOffset.success) {
    return NextResponse.json({ ok: false, error: "invalid_pagination" }, { status: 400 });
  }
  const result = await getPool().query(
    `select * from public.sleep_logs
     where user_id = $1::uuid
     order by log_date desc
     limit $2 offset $3`,
    [userId, parsedLimit.data, parsedOffset.data],
  );
  return NextResponse.json({ ok: true, logs: result.rows });
});

export const PATCH = withSession(async (request: NextRequest, { userId }) => {
  const body = await request.json().catch(() => null);
  const parsed = sleepInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const value = parsed.data;
  const result = await getPool().query(
    `insert into public.sleep_logs (
       user_id, log_date, sleep_time, wake_time, quality, disturbances, naps, notes,
       manual_duration_override, manual_duration_reason, working_sleep_target,
       target_sleep_range, target_source, timezone, schedule_context, updated_at
     ) values (
       $1::uuid, $2::date, $3::timestamptz, $4::timestamptz, $5, $6::jsonb, $7::jsonb, $8,
       $9, $10, $11, $12::jsonb, $13, $14, $15, now()
     )
     on conflict (user_id, log_date) do update set
       sleep_time = excluded.sleep_time,
       wake_time = excluded.wake_time,
       quality = excluded.quality,
       disturbances = excluded.disturbances,
       naps = excluded.naps,
       notes = excluded.notes,
       manual_duration_override = excluded.manual_duration_override,
       manual_duration_reason = excluded.manual_duration_reason,
       working_sleep_target = excluded.working_sleep_target,
       target_sleep_range = excluded.target_sleep_range,
       target_source = excluded.target_source,
       timezone = excluded.timezone,
       schedule_context = excluded.schedule_context,
       updated_at = now()
     returning *`,
    [
      userId,
      value.log_date,
      value.sleep_time ?? null,
      value.wake_time ?? null,
      value.quality ?? null,
      JSON.stringify(value.disturbances ?? []),
      JSON.stringify(value.naps ?? []),
      value.notes ?? null,
      value.manual_duration_override ?? null,
      value.manual_duration_reason ?? null,
      value.working_sleep_target ?? null,
      value.target_sleep_range ? JSON.stringify(value.target_sleep_range) : null,
      value.target_source ?? null,
      value.timezone ?? null,
      value.schedule_context ?? null,
    ],
  );
  return NextResponse.json({ ok: true, log: result.rows[0] });
});
