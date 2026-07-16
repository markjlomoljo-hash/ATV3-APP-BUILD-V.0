import { supabase } from "./supabase";
import { randomUUID } from "expo-crypto";
import {
  fetchFoodHistory,
  newMealEvent,
  newSnackEvent,
  saveMealEvent,
  saveSnackEvent,
} from "./food-service";
import { upsertSleepLog as saveSleepDermLog } from "./sleep-service";
import { isFoodDayComplete } from "./daily-log-completion";

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

export interface TodaySummary {
  date: string;
  skinStateLogged: boolean;
  sleepLogged: boolean;
  foodLogged: boolean;
  foodStarted: boolean;
  foodCompletionState: string;
  treatmentCheckedIn: boolean;
  stressLogged: boolean;
  logsCount: number;
}

// ─── Fetch today summary ──────────────────────────────────────────────────────

export async function fetchTodayLogs(userId: string): Promise<TodaySummary> {
  const today = new Date().toISOString().split("T")[0];

  const [dailyResult, sleepResult, foodResult, treatmentResult] =
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
        .select("id, completion_state")
        .eq("user_id", userId)
        .eq("log_date", today)
        .limit(5),
      supabase
        .from("treatment_checkins")
        .select("id")
        .eq("user_id", userId)
        .eq("checkin_date", today)
        .limit(1),
    ]);

  const dailyLog = dailyResult.data?.[0] as DailyLog | undefined;
  const sleepLogged = (sleepResult.data?.length ?? 0) > 0;
  const foodCompletionState = typeof foodResult.data?.[0]?.completion_state === "string"
    ? foodResult.data[0].completion_state
    : "not_started";
  const foodStarted = (foodResult.data?.length ?? 0) > 0 && foodCompletionState !== "not_started";
  const foodLogged = isFoodDayComplete(foodCompletionState);
  const treatmentCheckedIn = (treatmentResult.data?.length ?? 0) > 0;
  const stressLogged = !!dailyLog?.stress_level;

  // Count total logged items for today
  let count = 0;
  if (sleepLogged) count++;
  if (foodLogged) count++;
  if (treatmentCheckedIn) count++;
  if (stressLogged) count++;

  return {
    date: today,
    skinStateLogged: false, // skin state is tracked via acne_history, not daily
    sleepLogged,
    foodLogged,
    foodStarted,
    foodCompletionState,
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
  const dailyLogs = await fetchFoodHistory(days);
  return dailyLogs.flatMap((daily) => [
    ...daily.mealEvents.map((event): FoodLog => ({
      id: event.id,
      user_id: userId,
      log_date: daily.logDate,
      meal_type: event.type,
      is_baseline: Boolean(event.isBaseline),
      items: { description: event.items.map((item) => item.name).join(", ") },
      categories: { tags: event.tags },
      completed: true,
      notes: event.notes,
      created_at: event.time,
      updated_at: daily.updatedAt ?? event.time,
    })),
    ...daily.snackEvents.map((event): FoodLog => ({
      id: event.id,
      user_id: userId,
      log_date: daily.logDate,
      meal_type: "snack",
      is_baseline: false,
      items: { description: event.description },
      categories: { tags: event.tags },
      completed: true,
      notes: event.notes,
      created_at: event.time,
      updated_at: daily.updatedAt ?? event.time,
    })),
  ]);
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
  _userId: string,
  data: {
    quality: number;
    hours?: number;
    notes?: string;
  }
): Promise<SleepLog> {
  const today = new Date().toISOString().split("T")[0];

  const saved = await saveSleepDermLog(today, {
    quality: data.quality,
    notes: data.notes?.trim() || null,
  });
  return saved as unknown as SleepLog;
}

// ─── Log food ─────────────────────────────────────────────────────────────────

export async function logFood(
  _userId: string,
  data: {
    meal_type: string;
    description: string;
    notes?: string;
  }
): Promise<FoodLog> {
  const today = new Date().toISOString().split("T")[0];

  if (data.meal_type === "snack") {
    const event = newSnackEvent({
      time: new Date().toISOString(),
      description: data.description.trim(),
      photoStorageRef: null,
      portionEstimate: null,
      tags: [],
      confidenceLevel: "certain",
      notes: data.notes?.trim() || null,
    });
    await saveSnackEvent(today, event);
    return {
      id: event.id,
      user_id: _userId,
      log_date: today,
      meal_type: "snack",
      is_baseline: false,
      items: { description: event.description },
      categories: {},
      completed: true,
      notes: event.notes,
      created_at: event.time,
      updated_at: event.time,
    };
  }

  const event = newMealEvent({
    type: data.meal_type,
    time: new Date().toISOString(),
    items: [{ name: data.description.trim() }],
    tags: [],
    notes: data.notes?.trim() || null,
  });
  await saveMealEvent(today, event);
  return {
    id: event.id,
    user_id: _userId,
    log_date: today,
    meal_type: event.type,
    is_baseline: false,
    items: { description: event.items[0]?.name ?? "" },
    categories: {},
    completed: true,
    notes: event.notes,
    created_at: event.time,
    updated_at: event.time,
  };
}

// ─── Log stress ───────────────────────────────────────────────────────────────

export async function logStress(
  userId: string,
  data: {
    stress_level: number; // 1-10
    notes?: string;
  }
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Upsert daily_log for today
  const { data: existing } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", today)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("daily_logs")
      .update({
        stress_level: data.stress_level,
        notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`stress_log_update_failed: ${error.message}`);
  } else {
    const { error } = await supabase.from("daily_logs").insert({
      id: randomUUID(),
      user_id: userId,
      log_date: today,
      stress_level: data.stress_level,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(`stress_log_insert_failed: ${error.message}`);
  }
}

// ─── Log treatment checkin ────────────────────────────────────────────────────

export async function logTreatmentCheckin(
  userId: string,
  data: {
    status: "done" | "skipped" | "partial";
    irritation?: number;
    notes?: string;
  }
): Promise<TreatmentCheckin> {
  const today = new Date().toISOString().split("T")[0];

  const { data: created, error } = await supabase
    .from("treatment_checkins")
    .insert({
      id: randomUUID(),
      user_id: userId,
      checkin_date: today,
      status: data.status,
      irritation: data.irritation ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`treatment_checkin_insert_failed: ${error.message}`);
  return created as TreatmentCheckin;
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
