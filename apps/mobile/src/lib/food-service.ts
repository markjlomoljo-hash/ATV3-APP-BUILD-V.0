/** DermDiet daily-parent service. Meals and snacks are typed sub-events. */
import * as Crypto from "expo-crypto";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { apiFetch, apiMutation, createMutationOperation } from "./api";
import { supabase } from "./supabase";
import { resolveMealFrequencyBaseline } from "./profile-baseline-editor";

export type FoodItem = { name: string; portion?: string | null };

export type DailyMealEvent = {
  id: string;
  type: string;
  time: string;
  items: FoodItem[];
  tags: string[];
  notes: string | null;
  isBaseline?: boolean;
};

export type DailySnackEvent = {
  id: string;
  time: string;
  description: string;
  photoStorageRef: string | null;
  portionEstimate: string | null;
  tags: string[];
  confidenceLevel: "certain" | "unsure" | "unknown";
  notes: string | null;
};

export type MealFrequencyBaseline =
  | "1"
  | "2"
  | "3"
  | "varies"
  | "not_sure"
  | "prefer_not_to_answer"
  | null;

export type FoodCompletionState =
  | "not_started"
  | "partially_logged"
  | "meals_complete_no_snacks_logged"
  | "meals_complete_with_snacks_logged"
  | "user_marked_complete"
  | "incomplete_but_saved"
  | "backfilled"
  | "unknown_day"
  | "skipped_with_reason"
  | "offline_queued";

export type DailyFoodLog = {
  id: string | null;
  logDate: string;
  expectedMealCount: number | null;
  mealFrequencyBaseline: MealFrequencyBaseline;
  mealEvents: DailyMealEvent[];
  snackEvents: DailySnackEvent[];
  completionState: FoodCompletionState;
  userMarkedComplete: boolean;
  updatedAt: string | null;
};

type ApiFoodRow = {
  id: string;
  log_date: string;
  expected_meal_count: number | null;
  meal_events: DailyMealEvent[] | null;
  snack_events: DailySnackEvent[] | null;
  completion_state: FoodCompletionState;
  user_marked_complete: boolean;
  baseline_snapshot: Record<string, unknown> | null;
  updated_at: string;
};

type FetchResponse = {
  ok: true;
  date: string;
  baseline: Record<string, unknown>;
  expectedMealCount: number | null;
  completionState: FoodCompletionState;
  log: ApiFoodRow | null;
};

function normalizeDailyLog(response: FetchResponse): DailyFoodLog {
  const snapshot = response.log?.baseline_snapshot ?? response.baseline;
  return {
    id: response.log?.id ?? null,
    logDate: response.log?.log_date ?? response.date,
    expectedMealCount: response.log?.expected_meal_count ?? response.expectedMealCount,
    mealFrequencyBaseline: resolveMealFrequencyBaseline(response.baseline, snapshot),
    mealEvents: Array.isArray(response.log?.meal_events) ? response.log.meal_events : [],
    snackEvents: Array.isArray(response.log?.snack_events) ? response.log.snack_events : [],
    completionState: response.log?.completion_state ?? response.completionState,
    userMarkedComplete: response.log?.user_marked_complete ?? false,
    updatedAt: response.log?.updated_at ?? null,
  };
}

export const MEAL_TYPES = [
  { key: "meal_1", label: "Meal 1" },
  { key: "meal_2", label: "Meal 2" },
  { key: "meal_3", label: "Meal 3" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "other", label: "Other meal" },
] as const;

export const FOOD_CATEGORIES = [
  { id: "dairy", label: "Dairy" },
  { id: "high_glycemic", label: "High-glycemic" },
  { id: "sugary", label: "Sugary" },
  { id: "processed", label: "Processed" },
  { id: "fried_oily", label: "Fried/oily" },
  { id: "caffeine", label: "Caffeine" },
  { id: "spicy", label: "Spicy" },
  { id: "salty", label: "Salty" },
  { id: "high_fat", label: "High-fat" },
  { id: "user_specific_trigger", label: "User-specific trigger" },
  { id: "unknown", label: "Unknown" },
] as const;

export function expectedMealSlots(baseline: MealFrequencyBaseline): string[] {
  if (baseline === "1") return ["Meal 1"];
  if (baseline === "2") return ["Meal 1", "Meal 2"];
  if (baseline === "3") return ["Breakfast", "Lunch", "Dinner"];
  return [];
}

export async function fetchDailyFoodLog(date: string): Promise<DailyFoodLog> {
  const response = await apiFetch<FetchResponse>(`/api/logs/food?date=${encodeURIComponent(date)}`);
  return normalizeDailyLog(response);
}

async function mutateDailyFoodLog(
  payload: Record<string, unknown>,
): Promise<DailyFoodLog> {
  const response = await apiMutation<{ ok: true; log: ApiFoodRow }, Record<string, unknown>>(
    "PATCH",
    "/api/logs/food",
    createMutationOperation(payload),
  );
  return normalizeDailyLog({
    ok: true,
    date: response.log.log_date,
    baseline: response.log.baseline_snapshot ?? {},
    expectedMealCount: response.log.expected_meal_count,
    completionState: response.log.completion_state,
    log: response.log,
  });
}

export function newMealEvent(input: Omit<DailyMealEvent, "id">): DailyMealEvent {
  return { id: Crypto.randomUUID(), ...input };
}

export function newSnackEvent(input: Omit<DailySnackEvent, "id">): DailySnackEvent {
  return { id: Crypto.randomUUID(), ...input };
}

export function saveMealEvent(date: string, event: DailyMealEvent): Promise<DailyFoodLog> {
  return mutateDailyFoodLog({ date, operation: "upsert_meal", event });
}

export function saveSnackEvent(date: string, event: DailySnackEvent): Promise<DailyFoodLog> {
  return mutateDailyFoodLog({ date, operation: "upsert_snack", event });
}

export function deleteFoodEvent(
  date: string,
  eventKind: "meal" | "snack",
  eventId: string,
): Promise<DailyFoodLog> {
  return mutateDailyFoodLog({ date, operation: "delete_event", eventKind, eventId });
}

export function markDailyFoodLogComplete(date: string, complete: boolean): Promise<DailyFoodLog> {
  return mutateDailyFoodLog({ date, operation: "mark_complete", complete });
}

export async function uploadSnackPhoto(
  localUri: string,
  date: string,
  eventId: string,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth_required");

  const normalized = await manipulateAsync(
    localUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.78, format: SaveFormat.JPEG },
  );
  const response = await fetch(normalized.uri);
  if (!response.ok) throw new Error("snack_photo_read_failed");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("snack_photo_too_large");

  const storageRef = `${user.id}/food/${date}/${eventId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("food-log-photos")
    .upload(storageRef, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`snack_photo_upload_failed:${error.message}`);
  return storageRef;
}

export async function deleteSnackPhoto(storageRef: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth_required");
  if (!storageRef.startsWith(`${user.id}/food/`)) throw new Error("invalid_snack_photo_reference");

  const { error } = await supabase.storage.from("food-log-photos").remove([storageRef]);
  if (error) throw new Error(`snack_photo_delete_failed:${error.message}`);
}

export async function fetchFoodHistory(limit = 14): Promise<DailyFoodLog[]> {
  const dates = Array.from({ length: limit }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const logs = await Promise.all(dates.map(fetchDailyFoodLog));
  return logs.filter((log) => log.mealEvents.length > 0 || log.snackEvents.length > 0);
}
