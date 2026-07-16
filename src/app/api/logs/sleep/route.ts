import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db";
import { withSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableMetric = z.number().finite().min(0).max(10_000).nullable();
const rollingMetricSchema = z.object({
  "3d": nullableMetric,
  "7d": nullableMetric,
  "14d": nullableMetric,
  "30d": nullableMetric,
}).strict();

const sleepAnalyticsSchema = z.object({
  rule_version: z.literal("sleep-analytics-v2"),
  log_date: dateSchema,
  duration_minutes: z.number().int().min(1).max(1440).nullable(),
  duration_hours: z.number().finite().min(0).max(24).nullable(),
  duration_source: z.enum(["calculated", "manual_override", "insufficient_data"]),
  sleep_midpoint: z.string().datetime().nullable(),
  target_hours: z.number().finite().min(4).max(14).nullable(),
  daily_debt_hours: nullableMetric,
  cumulative_debt_7d: nullableMetric,
  sleep_debt_hours: rollingMetricSchema,
  debt_trend: z.enum(["improving", "stable", "worsening", "insufficient_data"]),
  debt_category: z.enum(["none/minimal", "mild", "moderate", "high", "severe", "insufficient_data"]),
  debt_source: z.enum(["calculated", "no_target_configured", "insufficient_data"]),
  average_duration_hours: rollingMetricSchema,
  onset_regularity_minutes: nullableMetric,
  wake_regularity_minutes: nullableMetric,
  midpoint_regularity_minutes: nullableMetric,
  bedtime_drift_minutes: nullableMetric,
  wake_drift_minutes: nullableMetric,
  circadian_alignment_score: z.number().int().min(0).max(100).nullable(),
  circadian_disruption_flag: z.boolean().nullable(),
  nocturnal_recovery_opportunity: z.enum([
    "Optimal", "Adequate", "Compromised", "Severely compromised", "Insufficient data",
  ]),
  sleep_pattern: z.enum(["stable", "shifting", "irregular", "unknown"]),
  score_factors: z.array(z.string().trim().min(1).max(200)).max(20),
  missing_data_notes: z.array(z.string().trim().min(1).max(500)).max(20),
  days_logged: z.number().int().min(0).max(3650),
  coverage_pct: z.number().int().min(0).max(100),
  readiness: z.enum(["sufficient_data", "insufficient_data"]),
  min_records_required: z.literal(7),
  confidence: z.enum(["high", "medium", "low", "insufficient_data"]),
}).strict().superRefine((value, context) => {
  const expectedReadiness = value.days_logged >= value.min_records_required
    ? "sufficient_data"
    : "insufficient_data";
  if (value.readiness !== expectedReadiness) {
    context.addIssue({ code: "custom", path: ["readiness"], message: "Readiness does not match record count" });
  }
  if (value.readiness === "insufficient_data") {
    if (value.circadian_alignment_score !== null || value.circadian_disruption_flag !== null) {
      context.addIssue({ code: "custom", path: ["circadian_alignment_score"], message: "Circadian output requires seven valid records" });
    }
    if (value.nocturnal_recovery_opportunity !== "Insufficient data") {
      context.addIssue({ code: "custom", path: ["nocturnal_recovery_opportunity"], message: "Recovery output requires seven valid records" });
    }
  }
});

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
  analytics_snapshot: sleepAnalyticsSchema.optional(),
}).superRefine((value, context) => {
  if (value.manual_duration_override != null && !value.manual_duration_reason) {
    context.addIssue({ code: "custom", path: ["manual_duration_reason"], message: "Override reason required" });
  }
  if (value.target_sleep_range && value.target_sleep_range[0] > value.target_sleep_range[1]) {
    context.addIssue({ code: "custom", path: ["target_sleep_range"], message: "Target range is reversed" });
  }
  if (value.analytics_snapshot?.log_date !== undefined && value.analytics_snapshot.log_date !== value.log_date) {
    context.addIssue({ code: "custom", path: ["analytics_snapshot", "log_date"], message: "Analytics date must match log date" });
  }
  if (value.analytics_snapshot) {
    const snapshotTarget = value.analytics_snapshot.target_hours;
    const logTarget = value.working_sleep_target ?? null;
    if (snapshotTarget !== logTarget) {
      context.addIssue({ code: "custom", path: ["analytics_snapshot", "target_hours"], message: "Analytics target must match log target" });
    }
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
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const analytics = value.analytics_snapshot;
    const result = await client.query(
      `insert into public.sleep_logs (
       user_id, log_date, sleep_time, wake_time, quality, disturbances, naps, notes,
       manual_duration_override, manual_duration_reason, working_sleep_target,
       target_sleep_range, target_source, timezone, schedule_context,
       analytics_snapshot, analytics_rule_version, analytics_source, analytics_computed_at, updated_at
     ) values (
       $1::uuid, $2::date, $3::timestamptz, $4::timestamptz, $5, $6::jsonb, $7::jsonb, $8,
       $9, $10, $11, $12::jsonb, $13, $14, $15,
       $16::jsonb, $17, $18, case when $16::jsonb is null then null else now() end, now()
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
       analytics_snapshot = coalesce(excluded.analytics_snapshot, sleep_logs.analytics_snapshot),
       analytics_rule_version = coalesce(excluded.analytics_rule_version, sleep_logs.analytics_rule_version),
       analytics_source = coalesce(excluded.analytics_source, sleep_logs.analytics_source),
       analytics_computed_at = case
         when excluded.analytics_snapshot is null then sleep_logs.analytics_computed_at
         else now()
       end,
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
        analytics ? JSON.stringify(analytics) : null,
        analytics?.rule_version ?? null,
        analytics ? "client_deterministic" : null,
      ],
    );
    if (analytics && result.rows[0]?.id) {
      await client.query(
        `insert into public.intelligence_events (
           user_id, module, event_type, runtime_mode, input_record_refs, payload
         ) values ($1::uuid, 'sleepderm', 'analytics_computed', 'client_deterministic', $2::jsonb, $3::jsonb)`,
        [
          userId,
          JSON.stringify([`sleep_logs:${result.rows[0].id}`]),
          JSON.stringify({
            ruleVersion: analytics.rule_version,
            source: "client_deterministic",
            readiness: analytics.readiness,
            confidence: analytics.confidence,
            analytics,
          }),
        ],
      );
    }
    await client.query("commit");
    return NextResponse.json({ ok: true, log: result.rows[0] });
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("sleep_log_update_failed", error);
    return NextResponse.json({ ok: false, error: "sleep_log_update_failed" }, { status: 500 });
  } finally {
    client.release();
  }
});
