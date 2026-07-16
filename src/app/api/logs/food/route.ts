import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/db";
import {
  deriveFoodCompletionState,
  mergeDailyFoodEvents,
  type DailyFoodEvents,
  type MealFrequencyBaseline,
} from "@/lib/acnetrex/food-log-contract";
import { withSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}, "Invalid calendar date");

const mealEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1).max(40),
  time: z.string().datetime(),
  items: z.array(
    z.object({ name: z.string().trim().min(1).max(200), portion: z.string().max(100).nullable().optional() }),
  ).min(1).max(30),
  tags: z.array(z.string().min(1).max(60)).max(30),
  notes: z.string().max(2000).nullable(),
  isBaseline: z.boolean().optional(),
});

const snackEventSchema = z.object({
  id: z.string().uuid(),
  time: z.string().datetime(),
  description: z.string().trim().min(1).max(500),
  photoStorageRef: z.string().max(500).nullable(),
  portionEstimate: z.string().max(100).nullable(),
  tags: z.array(z.string().min(1).max(60)).max(30),
  confidenceLevel: z.enum(["certain", "unsure", "unknown"]),
  notes: z.string().max(2000).nullable(),
});

const mutationSchema = z.intersection(
  z.object({ date: dateSchema }),
  z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("upsert_meal"), event: mealEventSchema }),
    z.object({ operation: z.literal("upsert_snack"), event: snackEventSchema }),
    z.object({
      operation: z.literal("delete_event"),
      eventKind: z.enum(["meal", "snack"]),
      eventId: z.string().uuid(),
    }),
    z.object({ operation: z.literal("mark_complete"), complete: z.boolean() }),
  ]),
);

function baselineValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mealFrequencyFrom(value: Record<string, unknown>): MealFrequencyBaseline {
  const raw = value.meal_frequency_baseline;
  return raw === "1" || raw === "2" || raw === "3" || raw === "varies" ||
    raw === "not_sure" || raw === "prefer_not_to_answer"
    ? raw
    : null;
}

function expectedMealCount(baseline: MealFrequencyBaseline): number | null {
  return baseline === "1" || baseline === "2" || baseline === "3" ? Number(baseline) : null;
}

export const GET = withSession(async (request: NextRequest, { userId }) => {
  const parsedDate = dateSchema.safeParse(request.nextUrl.searchParams.get("date"));
  if (!parsedDate.success) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }

  const result = await getPool().query(
    `select
       (select row_to_json(food) from (
          select id, log_date, expected_meal_count, meal_events, snack_events,
                 completion_state, user_marked_complete, baseline_snapshot, updated_at
          from public.food_logs
          where user_id = $1::uuid and log_date = $2::date
          limit 1
        ) food) as log,
       (select value_json from public.profile_sections
        where user_id = $1::uuid and section_key = 'lifestyle_baseline'
        limit 1) as baseline`,
    [userId, parsedDate.data],
  );
  const row = result.rows[0] ?? {};
  const baseline = baselineValue(row.baseline);
  const frequency = mealFrequencyFrom(baseline);
  return NextResponse.json({
    ok: true,
    date: parsedDate.data,
    baseline,
    expectedMealCount: expectedMealCount(frequency),
    completionState: row.log?.completion_state ?? "not_started",
    log: row.log ?? null,
  });
});

export const PATCH = withSession(async (request: NextRequest, { userId }) => {
  const body = await request.json().catch(() => null);
  const parsed = mutationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const baselineResult = await client.query(
      `select value_json from public.profile_sections
       where user_id = $1::uuid and section_key = 'lifestyle_baseline'
       limit 1`,
      [userId],
    );
    const baseline = baselineValue(baselineResult.rows[0]?.value_json);
    const frequency = mealFrequencyFrom(baseline);
    const expected = expectedMealCount(frequency);

    await client.query(
      `insert into public.food_logs (
         user_id, log_date, meal_type, items, categories, completed,
         expected_meal_count, meal_events, snack_events, completion_state,
         user_marked_complete, baseline_snapshot
       ) values ($1::uuid, $2::date, 'daily', '[]'::jsonb, '[]'::jsonb, false,
         $3::integer, '[]'::jsonb, '[]'::jsonb, 'not_started', false, $4::jsonb)
       on conflict (user_id, log_date) do nothing`,
      [userId, parsed.data.date, expected, JSON.stringify(baseline)],
    );

    const locked = await client.query(
      `select id, expected_meal_count, meal_events, snack_events, user_marked_complete,
              baseline_snapshot
       from public.food_logs
       where user_id = $1::uuid and log_date = $2::date
       for update`,
      [userId, parsed.data.date],
    );
    const current = locked.rows[0];
    if (!current) throw new Error("daily_food_log_parent_unavailable");

    let events: DailyFoodEvents = {
      mealEvents: Array.isArray(current.meal_events) ? current.meal_events : [],
      snackEvents: Array.isArray(current.snack_events) ? current.snack_events : [],
    };
    let userMarkedComplete = Boolean(current.user_marked_complete);
    if (parsed.data.operation === "mark_complete") {
      userMarkedComplete = parsed.data.complete;
    } else {
      events = mergeDailyFoodEvents(events, parsed.data);
    }

    const snapshotFrequency = mealFrequencyFrom(baselineValue(current.baseline_snapshot));
    const completionState = deriveFoodCompletionState({
      baseline: snapshotFrequency ?? frequency,
      mealCount: events.mealEvents.length,
      snackCount: events.snackEvents.length,
      userMarkedComplete,
    });
    const updated = await client.query(
      `update public.food_logs
       set meal_events = $3::jsonb,
           snack_events = $4::jsonb,
           completion_state = $5,
           user_marked_complete = $6,
           completed = $6,
           updated_at = now()
       where user_id = $1::uuid and log_date = $2::date
       returning id, log_date, expected_meal_count, meal_events, snack_events,
                 completion_state, user_marked_complete, baseline_snapshot, updated_at`,
      [
        userId,
        parsed.data.date,
        JSON.stringify(events.mealEvents),
        JSON.stringify(events.snackEvents),
        completionState,
        userMarkedComplete,
      ],
    );
    await client.query("commit");
    return NextResponse.json({ ok: true, log: updated.rows[0] });
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("daily_food_log_update_failed", error);
    return NextResponse.json({ ok: false, error: "daily_food_log_update_failed" }, { status: 500 });
  } finally {
    client.release();
  }
});
