import "server-only";

import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/db";
import {
  type ActivityLogInput,
  type ContactLogInput,
  type CycleLogInput,
  type DailyLogEntry,
  type DailyLogInput,
  type DailyLogKindSlug,
  type FoodLogInput,
  type HydrationLogInput,
  type RoutineLogInput,
  type SkinStateLogInput,
  type SleepLogInput,
  type StressLogInput,
} from "./kinds";

/**
 * Daily-log persistence against the live Supabase tables mobile already
 * writes, so web and mobile records form one corpus:
 *
 *  - sleep      -> public.sleep_logs      (uuid user_id, unique user_id+log_date)
 *  - food       -> public.food_logs       (uuid user_id, unique user_id+log_date,
 *                  events appended into meal_events / snack_events)
 *  - stress     -> public.daily_logs.stress_level (text user_id, one row/day —
 *                  same contract as mobile logStress)
 *  - activity, hydration, cycle, contact, routine
 *               -> public.daily_logs.activity jsonb, namespaced one key per
 *                  kind ({"hydration": {...}}) so kinds never clobber each
 *                  other or mobile's stress/notes columns. daily_logs has no
 *                  live unique (user_id, log_date) index, so writes use
 *                  select-for-update then update/insert inside the caller's
 *                  transaction instead of ON CONFLICT.
 *  - skin-state -> public.acne_history singleton (uuid user_id UNIQUE).
 *                  severity keeps the mild|moderate|severe enum; "clear" is
 *                  recorded verbatim in self_assessment with severity null.
 *
 * No derived values are invented here: every returned entry is the persisted
 * row (or the persisted slice of it) and empty history returns [].
 */

const DAILY_CONTEXT_KINDS = ["activity", "hydration", "cycle", "contact", "routine"] as const;
type DailyContextKind = (typeof DAILY_CONTEXT_KINDS)[number];

function isDailyContextKind(slug: DailyLogKindSlug): slug is DailyContextKind {
  return (DAILY_CONTEXT_KINDS as readonly string[]).includes(slug);
}

function isoOrNull(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function previousCalendarDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Compose durable sleep/wake timestamps from a log date plus local clock
 * times. When the bedtime is not earlier than the wake time the sleep window
 * crossed midnight, so bedtime belongs to the previous calendar day (the
 * mobile/computations duration convention). Times are stored at UTC offsets
 * deterministically; no timezone is guessed.
 */
export function computeSleepWindow(
  logDate: string,
  bedtime?: string,
  wakeTime?: string,
): { sleepTime: string | null; wakeTime: string | null; crossedMidnight: boolean } {
  if (!bedtime || !wakeTime) return { sleepTime: null, wakeTime: null, crossedMidnight: false };
  const crossedMidnight = wakeTime <= bedtime;
  const bedDate = crossedMidnight ? previousCalendarDate(logDate) : logDate;
  return {
    sleepTime: `${bedDate}T${bedtime}:00.000Z`,
    wakeTime: `${logDate}T${wakeTime}:00.000Z`,
    crossedMidnight,
  };
}

type SqlClient = Pick<PoolClient, "query">;

// ---------------------------------------------------------------------------
// Writes (run inside the route's idempotent transaction)
// ---------------------------------------------------------------------------

async function createSleepEntry(client: SqlClient, userId: string, input: SleepLogInput): Promise<DailyLogEntry> {
  const window = computeSleepWindow(input.logDate, input.bedtime, input.wakeTime);
  const notesProvided = input.notes !== undefined;
  const result = await client.query(
    `insert into public.sleep_logs (user_id, log_date, sleep_time, wake_time, quality, notes)
     values ($1::uuid, $2::date, $3::timestamptz, $4::timestamptz, $5::int, $6)
     on conflict (user_id, log_date) do update set
       quality = excluded.quality,
       sleep_time = coalesce(excluded.sleep_time, sleep_logs.sleep_time),
       wake_time = coalesce(excluded.wake_time, sleep_logs.wake_time),
       notes = case when $7::boolean then excluded.notes else sleep_logs.notes end,
       updated_at = now()
     returning id, log_date::text as "logDate", sleep_time as "sleepTime",
               wake_time as "wakeTime", quality, notes, updated_at as "recordedAt"`,
    [userId, input.logDate, window.sleepTime, window.wakeTime, input.quality, input.notes ?? null, notesProvided],
  );
  const row = result.rows[0];
  if (!row) throw new Error("sleep_log_write_missing");
  return mapSleepRow(row);
}

async function createFoodEntry(client: SqlClient, userId: string, input: FoodLogInput): Promise<DailyLogEntry> {
  const isSnack = input.entryType === "snack";
  const event = {
    id: randomUUID(),
    type: input.entryType,
    description: input.description,
    categories: input.categories,
    loggedAt: new Date().toISOString(),
    source: "web",
  };
  const notesProvided = input.notes !== undefined;
  const result = await client.query(
    `insert into public.food_logs
       (user_id, log_date, meal_type, is_baseline, meal_events, snack_events,
        expected_meal_count, completion_state, notes)
     values ($1::uuid, $2::date, 'daily', false,
             case when $3::boolean then '[]'::jsonb else jsonb_build_array($4::jsonb) end,
             case when $3::boolean then jsonb_build_array($4::jsonb) else '[]'::jsonb end,
             $5::int, 'partially_logged', $6)
     on conflict (user_id, log_date) do update set
       meal_events = case when $3::boolean then food_logs.meal_events
                          else coalesce(food_logs.meal_events, '[]'::jsonb) || jsonb_build_array($4::jsonb) end,
       snack_events = case when $3::boolean then coalesce(food_logs.snack_events, '[]'::jsonb) || jsonb_build_array($4::jsonb)
                           else food_logs.snack_events end,
       expected_meal_count = coalesce($5::int, food_logs.expected_meal_count),
       completion_state = case when food_logs.completion_state in ('not_started', 'unknown_day')
                               then 'partially_logged' else food_logs.completion_state end,
       notes = case when $7::boolean then $6 else food_logs.notes end,
       updated_at = now()
     returning id, log_date::text as "logDate", meal_events as "mealEvents",
               snack_events as "snackEvents", expected_meal_count as "expectedMealCount",
               completion_state as "completionState", notes, updated_at as "recordedAt"`,
    [userId, input.logDate, isSnack, JSON.stringify(event), input.expectedMealCount ?? null, input.notes ?? null, notesProvided],
  );
  const row = result.rows[0];
  if (!row) throw new Error("food_log_write_missing");
  return mapFoodRow(row);
}

async function createStressEntry(client: SqlClient, userId: string, input: StressLogInput): Promise<DailyLogEntry> {
  const notesProvided = input.notes !== undefined;
  const existing = await client.query(
    `select id from public.daily_logs where user_id = $1 and log_date = $2 limit 1 for update`,
    [userId, input.logDate],
  );
  const existingId = existing.rows[0]?.id as string | undefined;
  const result = existingId
    ? await client.query(
        `update public.daily_logs
            set stress_level = $1::int,
                notes = case when $2::boolean then $3 else notes end,
                updated_at = now()
          where id = $4
          returning id, log_date as "logDate", stress_level as "stressLevel", notes,
                    updated_at as "recordedAt"`,
        [input.stressLevel, notesProvided, input.notes ?? null, existingId],
      )
    : await client.query(
        `insert into public.daily_logs (user_id, log_date, stress_level, notes)
         values ($1, $2, $3::int, $4)
         returning id, log_date as "logDate", stress_level as "stressLevel", notes,
                   updated_at as "recordedAt"`,
        [userId, input.logDate, input.stressLevel, input.notes ?? null],
      );
  const row = result.rows[0];
  if (!row) throw new Error("stress_log_write_missing");
  return {
    id: String(row.id),
    kind: "stress",
    logDate: typeof row.logDate === "string" ? row.logDate : null,
    recordedAt: isoOrNull(row.recordedAt),
    values: { stressLevel: row.stressLevel },
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

type ContextInput =
  | ActivityLogInput
  | HydrationLogInput
  | CycleLogInput
  | ContactLogInput
  | RoutineLogInput;

async function createDailyContextEntry(
  client: SqlClient,
  userId: string,
  kind: DailyContextKind,
  input: ContextInput,
): Promise<DailyLogEntry> {
  const { logDate, ...rest } = input;
  const payload = { ...rest, recordedAt: new Date().toISOString(), source: "web" };
  const containerPatch = JSON.stringify({ [kind]: payload });

  const existing = await client.query(
    `select id from public.daily_logs where user_id = $1 and log_date = $2 limit 1 for update`,
    [userId, logDate],
  );
  const existingId = existing.rows[0]?.id as string | undefined;
  const result = existingId
    ? await client.query(
        `update public.daily_logs
            set activity = (case when jsonb_typeof(activity) = 'object' then activity
                                 else '{}'::jsonb end) || $1::jsonb,
                updated_at = now()
          where id = $2
          returning id, log_date as "logDate", activity, updated_at as "recordedAt"`,
        [containerPatch, existingId],
      )
    : await client.query(
        `insert into public.daily_logs (user_id, log_date, activity)
         values ($1, $2, $3::jsonb)
         returning id, log_date as "logDate", activity, updated_at as "recordedAt"`,
        [userId, logDate, containerPatch],
      );
  const row = result.rows[0];
  if (!row) throw new Error(`${kind}_log_write_missing`);
  return mapContextRow(kind, row);
}

async function createSkinStateEntry(client: SqlClient, userId: string, input: SkinStateLogInput): Promise<DailyLogEntry> {
  const notesProvided = input.notes !== undefined;
  // Mobile contract: "clear" is a real observation but not a severity grade,
  // so it is stored verbatim in self_assessment with severity null.
  const severity = input.severity === "clear" ? null : input.severity;
  const result = await client.query(
    `insert into public.acne_history (user_id, severity, self_assessment, notes)
     values ($1::uuid, $2, $3, $4)
     on conflict (user_id) do update set
       severity = excluded.severity,
       self_assessment = excluded.self_assessment,
       notes = case when $5::boolean then excluded.notes else acne_history.notes end,
       updated_at = now()
     returning id, severity, self_assessment as "selfAssessment", notes,
               updated_at as "recordedAt"`,
    [userId, severity, input.severity, input.notes ?? null, notesProvided],
  );
  const row = result.rows[0];
  if (!row) throw new Error("skin_state_write_missing");
  return mapSkinStateRow(row);
}

export async function createDailyLogEntry(
  client: SqlClient,
  userId: string,
  slug: DailyLogKindSlug,
  input: DailyLogInput,
): Promise<DailyLogEntry> {
  switch (slug) {
    case "sleep":
      return createSleepEntry(client, userId, input as SleepLogInput);
    case "food":
      return createFoodEntry(client, userId, input as FoodLogInput);
    case "stress":
      return createStressEntry(client, userId, input as StressLogInput);
    case "skin-state":
      return createSkinStateEntry(client, userId, input as SkinStateLogInput);
    default:
      if (isDailyContextKind(slug)) {
        return createDailyContextEntry(client, userId, slug, input as ContextInput);
      }
      throw new Error("unknown_log_kind");
  }
}

// ---------------------------------------------------------------------------
// History reads (owner-scoped; empty history returns [] — never invented)
// ---------------------------------------------------------------------------

function mapSleepRow(row: Record<string, unknown>): DailyLogEntry {
  return {
    id: String(row.id),
    kind: "sleep",
    logDate: typeof row.logDate === "string" ? row.logDate : null,
    recordedAt: isoOrNull(row.recordedAt),
    values: {
      quality: row.quality ?? null,
      sleepTime: isoOrNull(row.sleepTime),
      wakeTime: isoOrNull(row.wakeTime),
    },
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

function mapFoodRow(row: Record<string, unknown>): DailyLogEntry {
  return {
    id: String(row.id),
    kind: "food",
    logDate: typeof row.logDate === "string" ? row.logDate : null,
    recordedAt: isoOrNull(row.recordedAt),
    values: {
      mealEvents: Array.isArray(row.mealEvents) ? row.mealEvents : [],
      snackEvents: Array.isArray(row.snackEvents) ? row.snackEvents : [],
      expectedMealCount: typeof row.expectedMealCount === "number" ? row.expectedMealCount : null,
      completionState: typeof row.completionState === "string" ? row.completionState : null,
    },
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

function mapContextRow(kind: DailyContextKind, row: Record<string, unknown>): DailyLogEntry {
  const container = row.activity;
  const payload =
    typeof container === "object" && container !== null && !Array.isArray(container)
      ? (container as Record<string, unknown>)[kind]
      : null;
  const values =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const notes = typeof values.notes === "string" ? values.notes : null;
  return {
    id: String(row.id),
    kind,
    logDate: typeof row.logDate === "string" ? row.logDate : null,
    recordedAt: isoOrNull(row.recordedAt),
    values,
    notes,
  };
}

function mapSkinStateRow(row: Record<string, unknown>): DailyLogEntry {
  return {
    id: String(row.id),
    kind: "skin-state",
    logDate: null,
    recordedAt: isoOrNull(row.recordedAt),
    values: {
      severity: typeof row.severity === "string" ? row.severity : null,
      selfAssessment: typeof row.selfAssessment === "string" ? row.selfAssessment : null,
    },
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

export async function listDailyLogEntries(
  userId: string,
  slug: DailyLogKindSlug,
  limit = 30,
): Promise<DailyLogEntry[]> {
  const boundedLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const pool = getPool();

  if (slug === "sleep") {
    const result = await pool.query(
      `select id, log_date::text as "logDate", sleep_time as "sleepTime",
              wake_time as "wakeTime", quality, notes, updated_at as "recordedAt"
         from public.sleep_logs
        where user_id = $1::uuid
        order by log_date desc
        limit $2::int`,
      [userId, boundedLimit],
    );
    return result.rows.map((row) => mapSleepRow(row as Record<string, unknown>));
  }

  if (slug === "food") {
    const result = await pool.query(
      `select id, log_date::text as "logDate", meal_events as "mealEvents",
              snack_events as "snackEvents", expected_meal_count as "expectedMealCount",
              completion_state as "completionState", notes, updated_at as "recordedAt"
         from public.food_logs
        where user_id = $1::uuid
        order by log_date desc
        limit $2::int`,
      [userId, boundedLimit],
    );
    return result.rows.map((row) => mapFoodRow(row as Record<string, unknown>));
  }

  if (slug === "stress") {
    const result = await pool.query(
      `select id, log_date as "logDate", stress_level as "stressLevel", notes,
              updated_at as "recordedAt"
         from public.daily_logs
        where user_id = $1 and stress_level is not null
        order by log_date desc
        limit $2::int`,
      [userId, boundedLimit],
    );
    return result.rows.map((row) => {
      const record = row as Record<string, unknown>;
      return {
        id: String(record.id),
        kind: "stress" as const,
        logDate: typeof record.logDate === "string" ? record.logDate : null,
        recordedAt: isoOrNull(record.recordedAt),
        values: { stressLevel: record.stressLevel },
        notes: typeof record.notes === "string" ? record.notes : null,
      };
    });
  }

  if (slug === "skin-state") {
    const result = await pool.query(
      `select id, severity, self_assessment as "selfAssessment", notes,
              updated_at as "recordedAt"
         from public.acne_history
        where user_id = $1::uuid
        limit 1`,
      [userId],
    );
    return result.rows.map((row) => mapSkinStateRow(row as Record<string, unknown>));
  }

  if (isDailyContextKind(slug)) {
    const result = await pool.query(
      `select id, log_date as "logDate", activity, updated_at as "recordedAt"
         from public.daily_logs
        where user_id = $1 and (activity -> $2::text) is not null
        order by log_date desc
        limit $3::int`,
      [userId, slug, boundedLimit],
    );
    return result.rows.map((row) => mapContextRow(slug, row as Record<string, unknown>));
  }

  throw new Error("unknown_log_kind");
}
