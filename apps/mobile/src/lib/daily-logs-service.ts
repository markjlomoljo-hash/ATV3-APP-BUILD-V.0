import { supabase } from "./supabase";
import { randomUUID } from "expo-crypto";

import { writeOutboxEvent, type OutboxEventType } from "./outbox-service";
import {
  enqueueLocalOutboxEvent,
  replayPendingOutboxEvents,
} from "./local-outbox";
import { isNetworkAvailable, isNetworkError } from "./network";
import type { SkinStateSeverity } from "./contracts";

// ─── Write outcome contract ──────────────────────────────────────────────────
// Every write either really persisted to the server ("saved") or was durably
// queued on-device for replay ("queued_offline"). No fabricated success.

export type WriteOutcome<T> =
  | { status: "saved"; data: T }
  | { status: "queued_offline" };

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * After a write reached the server: mirror the event into the server outbox
 * (idempotent per deduplication key) and drain any locally queued events now
 * that the network is proven reachable. Both are fire-and-forget.
 */
function afterSuccessfulWrite(
  userId: string,
  eventType: OutboxEventType,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  deduplicationKey: string
): void {
  void writeOutboxEvent(
    userId,
    eventType,
    aggregateType,
    aggregateId,
    payload,
    deduplicationKey
  ).catch(() => undefined);
  void replayPendingOutboxEvents().catch(() => undefined);
}

// ─── Types matching actual DB schema ─────────────────────────────────────────

export interface SleepLog {
  id: string;
  user_id: string;
  log_date: string;
  sleep_time: string | null;
  wake_time: string | null;
  quality: number | null; // 1-5
  disturbances: Record<string, unknown> | null;
  naps: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: string | null; // breakfast, lunch, dinner, snack
  is_baseline: boolean;
  items: Record<string, unknown> | null;
  categories: Record<string, unknown> | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentCheckin {
  id: string;
  plan_id: string | null;
  user_id: string;
  checkin_date: string;
  status: string; // done, skipped, partial
  irritation: number | null; // 0-10
  notes: string | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  sleep: Record<string, unknown> | null;
  food: Record<string, unknown> | null;
  stress_level: number | null; // 1-10
  activity: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The user's acne_history row — a one-row-per-user singleton (UNIQUE
 * user_id) shared with web onboarding. severity holds the web schema's
 * enum (mild | moderate | severe) or null; "clear" is kept verbatim in
 * self_assessment.
 */
export interface SkinStateLog {
  id: string;
  user_id: string;
  severity: string | null;
  self_assessment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodaySummary {
  date: string;
  skinStateLogged: boolean;
  sleepLogged: boolean;
  foodLogged: boolean;
  treatmentCheckedIn: boolean;
  stressLogged: boolean;
  logsCount: number;
}

// ─── Fetch today summary ──────────────────────────────────────────────────────

export async function fetchTodayLogs(userId: string): Promise<TodaySummary> {
  const today = new Date().toISOString().split("T")[0];

  const [dailyResult, sleepResult, foodResult, treatmentResult, skinResult] =
    await Promise.all([
      supabase
        .from("daily_logs")
        .select("id, stress_level, sleep, food")
        .eq("user_id", userId)
        .eq("log_date", today)
        .limit(1),
      supabase
        .from("sleep_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("log_date", today)
        .limit(1),
      supabase
        .from("food_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("log_date", today)
        .limit(5),
      supabase
        .from("treatment_checkins")
        .select("id")
        .eq("user_id", userId)
        .eq("checkin_date", today)
        .limit(1),
      // Skin state lives in the acne_history singleton (one row per user,
      // UNIQUE user_id). Today's quick log upserts that row and bumps
      // updated_at, so "logged today" means the singleton was updated today.
      supabase
        .from("acne_history")
        .select("id")
        .eq("user_id", userId)
        .gte("updated_at", `${today}T00:00:00.000Z`)
        .limit(1),
    ]);

  const dailyLog = dailyResult.data?.[0] as DailyLog | undefined;
  const sleepLogged = (sleepResult.data?.length ?? 0) > 0;
  const foodLogged = (foodResult.data?.length ?? 0) > 0;
  const treatmentCheckedIn = (treatmentResult.data?.length ?? 0) > 0;
  const stressLogged = !!dailyLog?.stress_level;
  const skinStateLogged = (skinResult.data?.length ?? 0) > 0;

  // Count total logged items for today
  let count = 0;
  if (sleepLogged) count++;
  if (foodLogged) count++;
  if (treatmentCheckedIn) count++;
  if (stressLogged) count++;
  if (skinStateLogged) count++;

  return {
    date: today,
    skinStateLogged,
    sleepLogged,
    foodLogged,
    treatmentCheckedIn,
    stressLogged,
    logsCount: count,
  };
}

// ─── Fetch recent sleep logs ──────────────────────────────────────────────────

export async function fetchRecentSleepLogs(
  userId: string,
  days = 14
): Promise<SleepLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", sinceStr)
    .order("log_date", { ascending: false })
    .limit(50);

  if (error) throw new Error(`sleep_logs_fetch_failed: ${error.message}`);
  return (data ?? []) as SleepLog[];
}

// ─── Fetch recent food logs ───────────────────────────────────────────────────

export async function fetchRecentFoodLogs(
  userId: string,
  days = 7
): Promise<FoodLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", sinceStr)
    .order("log_date", { ascending: false })
    .limit(100);

  if (error) throw new Error(`food_logs_fetch_failed: ${error.message}`);
  return (data ?? []) as FoodLog[];
}

// ─── Fetch recent treatment checkins ─────────────────────────────────────────

export async function fetchRecentTreatmentCheckins(
  userId: string,
  days = 14
): Promise<TreatmentCheckin[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("treatment_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_date", sinceStr)
    .order("checkin_date", { ascending: false })
    .limit(50);

  if (error) throw new Error(`treatment_checkins_fetch_failed: ${error.message}`);
  return (data ?? []) as TreatmentCheckin[];
}

// ─── Log sleep ────────────────────────────────────────────────────────────────

export async function logSleep(
  userId: string,
  data: {
    quality: number;
    /** Local clock bed time "HH:MM" — enables SleepDerm duration analysis. */
    sleep_time?: string;
    /** Local clock wake time "HH:MM". */
    wake_time?: string;
    notes?: string;
  }
): Promise<WriteOutcome<SleepLog>> {
  const today = todayDateString();
  const row = {
    id: randomUUID(),
    user_id: userId,
    log_date: today,
    quality: data.quality,
    // Only written when actually provided — a quality-only quick log must
    // never erase real times the user logged earlier today.
    ...(data.sleep_time ? { sleep_time: data.sleep_time } : {}),
    ...(data.wake_time ? { wake_time: data.wake_time } : {}),
    notes: data.notes ?? null,
  };
  const dedupKey = `${userId}:sleep_log.created:${today}`;

  const queueOffline = async (): Promise<WriteOutcome<SleepLog>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "sleep_log.created",
      "sleep_log",
      row.id,
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  // Check for existing sleep log today — update if exists
  const { data: existing, error: readError } = await supabase
    .from("sleep_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", today)
    .limit(1);
  if (readError && isNetworkError(readError.message)) return queueOffline();

  const existingId = existing?.[0]?.id as string | undefined;
  if (existingId) {
    const { data: updated, error } = await supabase
      .from("sleep_logs")
      .update({
        quality: data.quality,
        ...(data.sleep_time ? { sleep_time: data.sleep_time } : {}),
        ...(data.wake_time ? { wake_time: data.wake_time } : {}),
        notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId)
      .select()
      .single();
    if (error) {
      if (isNetworkError(error.message)) return queueOffline();
      throw new Error(`sleep_log_update_failed: ${error.message}`);
    }
    afterSuccessfulWrite(
      userId,
      "sleep_log.created",
      "sleep_log",
      existingId,
      { ...row, id: existingId },
      dedupKey
    );
    return { status: "saved", data: updated as SleepLog };
  }

  const { data: created, error } = await supabase
    .from("sleep_logs")
    .insert(row)
    .select()
    .single();

  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`sleep_log_insert_failed: ${error.message}`);
  }
  afterSuccessfulWrite(userId, "sleep_log.created", "sleep_log", row.id, row, dedupKey);
  return { status: "saved", data: created as SleepLog };
}

// ─── Log food ─────────────────────────────────────────────────────────────────

export async function logFood(
  userId: string,
  data: {
    meal_type: string;
    description: string;
    notes?: string;
  }
): Promise<WriteOutcome<FoodLog>> {
  const today = todayDateString();
  const row = {
    id: randomUUID(),
    user_id: userId,
    log_date: today,
    meal_type: data.meal_type,
    is_baseline: false,
    items: { description: data.description },
    completed: true,
    notes: data.notes ?? null,
  };
  // Multiple meals per day are valid, so the dedup key is per-row.
  const dedupKey = `${userId}:food_log.created:${row.id}`;

  const queueOffline = async (): Promise<WriteOutcome<FoodLog>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "food_log.created",
      "food_log",
      row.id,
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  const { data: created, error } = await supabase
    .from("food_logs")
    .insert(row)
    .select()
    .single();

  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`food_log_insert_failed: ${error.message}`);
  }
  afterSuccessfulWrite(userId, "food_log.created", "food_log", row.id, row, dedupKey);
  return { status: "saved", data: created as FoodLog };
}

// ─── Log stress ───────────────────────────────────────────────────────────────

export async function logStress(
  userId: string,
  data: {
    stress_level: number; // 1-10
    notes?: string;
  }
): Promise<WriteOutcome<null>> {
  const today = todayDateString();
  const row = {
    id: randomUUID(),
    user_id: userId,
    log_date: today,
    stress_level: data.stress_level,
    notes: data.notes ?? null,
  };
  const dedupKey = `${userId}:daily_log.updated:${today}`;

  const queueOffline = async (): Promise<WriteOutcome<null>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "daily_log.updated",
      "daily_log",
      row.id,
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  // Upsert daily_log for today
  const { data: existing, error: readError } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", today)
    .limit(1);
  if (readError && isNetworkError(readError.message)) return queueOffline();

  const existingId = existing?.[0]?.id as string | undefined;
  if (existingId) {
    const { error } = await supabase
      .from("daily_logs")
      .update({
        stress_level: data.stress_level,
        notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId);
    if (error) {
      if (isNetworkError(error.message)) return queueOffline();
      throw new Error(`stress_log_update_failed: ${error.message}`);
    }
    afterSuccessfulWrite(
      userId,
      "daily_log.updated",
      "daily_log",
      existingId,
      { ...row, id: existingId },
      dedupKey
    );
    return { status: "saved", data: null };
  }

  const { error } = await supabase.from("daily_logs").insert(row);
  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`stress_log_insert_failed: ${error.message}`);
  }
  afterSuccessfulWrite(userId, "daily_log.updated", "daily_log", row.id, row, dedupKey);
  return { status: "saved", data: null };
}

// ─── Log treatment checkin ────────────────────────────────────────────────────

export async function logTreatmentCheckin(
  userId: string,
  data: {
    status: "done" | "skipped" | "partial";
    irritation?: number;
    notes?: string;
  }
): Promise<WriteOutcome<TreatmentCheckin>> {
  const today = todayDateString();
  const row = {
    id: randomUUID(),
    user_id: userId,
    checkin_date: today,
    status: data.status,
    irritation: data.irritation ?? null,
    notes: data.notes ?? null,
  };
  const dedupKey = `${userId}:treatment_checkin.created:${row.id}`;

  const queueOffline = async (): Promise<WriteOutcome<TreatmentCheckin>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "treatment_checkin.created",
      "treatment_checkin",
      row.id,
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  const { data: created, error } = await supabase
    .from("treatment_checkins")
    .insert(row)
    .select()
    .single();

  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`treatment_checkin_insert_failed: ${error.message}`);
  }
  afterSuccessfulWrite(
    userId,
    "treatment_checkin.created",
    "treatment_checkin",
    row.id,
    row,
    dedupKey
  );
  return { status: "saved", data: created as TreatmentCheckin };
}

// ─── Log skin state ───────────────────────────────────────────────────────────
// Observed skin state lives in acne_history — a ONE-ROW-PER-USER singleton
// (UNIQUE user_id; the web app writes it with upsert-by-user_id and reads it
// with maybeSingle). A daily quick log therefore updates the singleton
// instead of appending rows: inserting a fresh row per day would violate the
// unique constraint for anyone with an existing row. "Logged today" is
// derived from updated_at (see fetchTodayLogs).
//
// severity follows the web schema's enum (mild | moderate | severe).
// "Clear" is a real observation but not a severity grade, so it is recorded
// verbatim in self_assessment with severity set to null — nothing invented,
// nothing coerced into an out-of-enum value.

export async function logSkinState(
  userId: string,
  data: {
    severity: SkinStateSeverity;
    notes?: string;
  }
): Promise<WriteOutcome<SkinStateLog>> {
  const today = todayDateString();
  const row = {
    user_id: userId,
    severity: data.severity === "clear" ? null : data.severity,
    self_assessment: data.severity,
    // Only overwrite notes the user actually typed — the singleton's notes
    // column may hold longer-form history captured during web onboarding.
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    updated_at: new Date().toISOString(),
  };
  const dedupKey = `${userId}:skin_state.logged:${today}`;

  const queueOffline = async (): Promise<WriteOutcome<SkinStateLog>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "skin_state.logged",
      "acne_history",
      userId, // singleton — the aggregate is keyed by the user
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  const { data: saved, error } = await supabase
    .from("acne_history")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`skin_state_log_upsert_failed: ${error.message}`);
  }
  afterSuccessfulWrite(userId, "skin_state.logged", "acne_history", userId, row, dedupKey);
  return { status: "saved", data: saved as SkinStateLog };
}

// ─── Logging streak ───────────────────────────────────────────────────────────
// The streak is computed only from logs that actually exist on the server.
// Zero history yields a zero streak — never a seeded or fabricated value.

export interface StreakSummary {
  currentStreakDays: number;
  todayLogged: boolean;
  lastLogDate: string | null;
}

function previousDateString(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().split("T")[0];
}

export async function fetchLoggingStreak(
  userId: string,
  windowDays = 180
): Promise<StreakSummary> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const sinceStr = since.toISOString().split("T")[0];

  const [sleepResult, foodResult, dailyResult, treatmentResult, skinResult] =
    await Promise.all([
      supabase
        .from("sleep_logs")
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", sinceStr)
        .limit(1000),
      supabase
        .from("food_logs")
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", sinceStr)
        .limit(1000),
      supabase
        .from("daily_logs")
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", sinceStr)
        .limit(1000),
      supabase
        .from("treatment_checkins")
        .select("checkin_date")
        .eq("user_id", userId)
        .gte("checkin_date", sinceStr)
        .limit(1000),
      // acne_history is a one-row-per-user singleton: only its creation and
      // latest-update dates exist server-side, so those are the only
      // skin-state dates that can honestly count. No created_at window
      // filter — an old row updated today must still be seen.
      supabase
        .from("acne_history")
        .select("created_at, updated_at")
        .eq("user_id", userId)
        .limit(5),
    ]);

  // A partial read would understate the streak, so fail instead of guessing.
  for (const result of [sleepResult, foodResult, dailyResult, treatmentResult, skinResult]) {
    if (result.error) throw new Error(`streak_fetch_failed: ${result.error.message}`);
  }

  const dates = new Set<string>();
  for (const row of sleepResult.data ?? []) dates.add(String(row.log_date));
  for (const row of foodResult.data ?? []) dates.add(String(row.log_date));
  for (const row of dailyResult.data ?? []) dates.add(String(row.log_date));
  for (const row of treatmentResult.data ?? []) dates.add(String(row.checkin_date));
  for (const row of skinResult.data ?? []) {
    if (row.created_at) dates.add(String(row.created_at).slice(0, 10));
    if (row.updated_at) dates.add(String(row.updated_at).slice(0, 10));
  }

  const today = todayDateString();
  const todayLogged = dates.has(today);

  // Streak counts consecutive logged days ending today, or ending yesterday
  // when today has not been logged yet (the streak is at risk, not broken).
  let cursor = todayLogged ? today : previousDateString(today);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = previousDateString(cursor);
  }

  const lastLogDate =
    dates.size > 0 ? [...dates].sort((a, b) => b.localeCompare(a))[0] : null;

  return { currentStreakDays: streak, todayLogged, lastLogDate };
}

// ─── Fetch insights data ──────────────────────────────────────────────────────

export interface InsightsSummary {
  totalLogs: number;
  sleepLogs: SleepLog[];
  foodLogs: FoodLog[];
  treatmentCheckins: TreatmentCheckin[];
  avgSleepQuality: number | null;
  treatmentAdherence: number | null; // 0-1
}

export async function fetchInsightsData(
  userId: string,
  days = 30
): Promise<InsightsSummary> {
  const [sleepLogs, foodLogs, treatmentCheckins] = await Promise.all([
    fetchRecentSleepLogs(userId, days),
    fetchRecentFoodLogs(userId, days),
    fetchRecentTreatmentCheckins(userId, days),
  ]);

  const avgSleepQuality =
    sleepLogs.length > 0
      ? sleepLogs
          .filter((l) => l.quality !== null)
          .reduce((sum, l) => sum + (l.quality ?? 0), 0) /
        sleepLogs.filter((l) => l.quality !== null).length
      : null;

  const doneTreatments = treatmentCheckins.filter(
    (c) => c.status === "done"
  ).length;
  const treatmentAdherence =
    treatmentCheckins.length > 0
      ? doneTreatments / treatmentCheckins.length
      : null;

  const totalLogs = sleepLogs.length + foodLogs.length + treatmentCheckins.length;

  return {
    totalLogs,
    sleepLogs,
    foodLogs,
    treatmentCheckins,
    avgSleepQuality,
    treatmentAdherence,
  };
}
