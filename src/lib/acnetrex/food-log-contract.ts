export type MealFrequencyBaseline =
  | "1"
  | "2"
  | "3"
  | "varies"
  | "not_sure"
  | "prefer_not_to_answer"
  | null;

export type FoodLogCompletionState =
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

export type DailyMealEvent = {
  id: string;
  type: string;
  time: string;
  items: Array<{ name: string; portion?: string | null }>;
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

export type DailyFoodEvents = {
  mealEvents: DailyMealEvent[];
  snackEvents: DailySnackEvent[];
};

export type DailyFoodMutation =
  | { operation: "upsert_meal"; event: DailyMealEvent }
  | { operation: "upsert_snack"; event: DailySnackEvent }
  | { operation: "delete_event"; eventKind: "meal" | "snack"; eventId: string };

function upsertById<T extends { id: string }>(events: T[], event: T): T[] {
  const existingIndex = events.findIndex((candidate) => candidate.id === event.id);
  if (existingIndex < 0) return [...events, event];
  return events.map((candidate, index) => (index === existingIndex ? event : candidate));
}

export function mergeDailyFoodEvents(
  current: DailyFoodEvents,
  mutation: DailyFoodMutation,
): DailyFoodEvents {
  if (mutation.operation === "upsert_meal") {
    return { ...current, mealEvents: upsertById(current.mealEvents, mutation.event) };
  }
  if (mutation.operation === "upsert_snack") {
    return { ...current, snackEvents: upsertById(current.snackEvents, mutation.event) };
  }
  if (mutation.eventKind === "meal") {
    return {
      ...current,
      mealEvents: current.mealEvents.filter((event) => event.id !== mutation.eventId),
    };
  }
  return {
    ...current,
    snackEvents: current.snackEvents.filter((event) => event.id !== mutation.eventId),
  };
}

export function expectedMealSlots(baseline: MealFrequencyBaseline): string[] {
  if (baseline === "1") return ["Meal 1"];
  if (baseline === "2") return ["Meal 1", "Meal 2"];
  if (baseline === "3") return ["Breakfast", "Lunch", "Dinner"];
  return [];
}

export function deriveFoodCompletionState(input: {
  baseline: MealFrequencyBaseline;
  mealCount: number;
  snackCount: number;
  userMarkedComplete?: boolean;
  backfilled?: boolean;
  dayKnown?: boolean;
  skippedWithReason?: boolean;
  offline?: boolean;
}): FoodLogCompletionState {
  if (input.offline) return "offline_queued";
  if (input.backfilled) return "backfilled";
  if (input.skippedWithReason) return "skipped_with_reason";
  if (input.dayKnown === false) return "unknown_day";
  if (input.userMarkedComplete) return "user_marked_complete";

  const eventCount = input.mealCount + input.snackCount;
  if (eventCount === 0) return "not_started";

  const expectedMealCount = input.baseline ? Number(input.baseline) : Number.NaN;
  if (!Number.isInteger(expectedMealCount)) return "incomplete_but_saved";
  if (input.mealCount < expectedMealCount) return "partially_logged";
  return input.snackCount > 0
    ? "meals_complete_with_snacks_logged"
    : "meals_complete_no_snacks_logged";
}
