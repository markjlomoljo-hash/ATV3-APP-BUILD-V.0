export interface FoodEvent {
  eventId: string;
  kind: "meal" | "snack";
  occurredAt: string;
  mealSlot?: 1 | 2 | 3;
  categories?: string[];
}

export interface DietDayAnalysis {
  expectedMeals: 1 | 2 | 3;
  loggedMealSlots: number[];
  mealCompletion: number;
  snackCount: number;
  duplicateEventIds: string[];
  state: "ready" | "partial" | "insufficient_data";
  limitations: string[];
}

export function analyzeDietDay(expectedMeals: 1 | 2 | 3, events: FoodEvent[]): DietDayAnalysis {
  const uniqueEvents = new Map<string, FoodEvent>();
  const duplicateEventIds = new Set<string>();
  for (const event of events) {
    if (uniqueEvents.has(event.eventId)) duplicateEventIds.add(event.eventId);
    else uniqueEvents.set(event.eventId, event);
  }
  const unique = [...uniqueEvents.values()];
  const loggedMealSlots = [...new Set(
    unique
      .filter((event) => event.kind === "meal" && event.mealSlot !== undefined)
      .map((event) => event.mealSlot as number),
  )].sort((first, second) => first - second);
  const snackCount = unique.filter((event) => event.kind === "snack").length;
  const mealCompletion = Math.min(
    1,
    loggedMealSlots.filter((slot) => slot <= expectedMeals).length / expectedMeals,
  );

  return {
    expectedMeals,
    loggedMealSlots,
    mealCompletion,
    snackCount,
    duplicateEventIds: [...duplicateEventIds],
    state: mealCompletion === 1 ? "ready" : unique.length ? "partial" : "insufficient_data",
    limitations: [
      "An unlogged meal is missing data, not evidence that a meal was skipped.",
      "Food-category patterns are associations and do not establish acne causation.",
    ],
  };
}
