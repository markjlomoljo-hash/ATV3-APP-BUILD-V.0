import { describe, expect, it } from "vitest";
import {
  deriveFoodCompletionState,
  expectedMealSlots,
  mergeDailyFoodEvents,
} from "./food-log-contract";

describe("progressive daily food log contract", () => {
  it("adapts expected meal slots to the onboarding baseline", () => {
    expect(expectedMealSlots("1")).toEqual(["Meal 1"]);
    expect(expectedMealSlots("2")).toEqual(["Meal 1", "Meal 2"]);
    expect(expectedMealSlots("3")).toEqual(["Breakfast", "Lunch", "Dinner"]);
    expect(expectedMealSlots("varies")).toEqual([]);
    expect(expectedMealSlots("prefer_not_to_answer")).toEqual([]);
  });

  it("does not mark a fixed-baseline day complete before expected meals exist", () => {
    expect(deriveFoodCompletionState({ baseline: "3", mealCount: 0, snackCount: 0 })).toBe(
      "not_started",
    );
    expect(deriveFoodCompletionState({ baseline: "3", mealCount: 2, snackCount: 3 })).toBe(
      "partially_logged",
    );
  });

  it("treats snacks as optional sub-events and supports honest terminal states", () => {
    expect(deriveFoodCompletionState({ baseline: "2", mealCount: 2, snackCount: 0 })).toBe(
      "meals_complete_no_snacks_logged",
    );
    expect(deriveFoodCompletionState({ baseline: "2", mealCount: 2, snackCount: 2 })).toBe(
      "meals_complete_with_snacks_logged",
    );
    expect(
      deriveFoodCompletionState({
        baseline: "varies",
        mealCount: 1,
        snackCount: 1,
        userMarkedComplete: true,
      }),
    ).toBe("user_marked_complete");
    expect(
      deriveFoodCompletionState({ baseline: "2", mealCount: 1, snackCount: 0, offline: true }),
    ).toBe("offline_queued");
  });

  it("upserts repeated sub-events by id without creating another daily parent", () => {
    const meal = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "meal_1",
      time: "2026-07-16T08:00:00.000Z",
      items: [{ name: "Oatmeal" }],
      tags: [],
      notes: null,
    };
    const first = mergeDailyFoodEvents(
      { mealEvents: [], snackEvents: [] },
      { operation: "upsert_meal", event: meal },
    );
    const updated = mergeDailyFoodEvents(first, {
      operation: "upsert_meal",
      event: { ...meal, notes: "With berries" },
    });
    const withSnack = mergeDailyFoodEvents(updated, {
      operation: "upsert_snack",
      event: {
        id: "22222222-2222-4222-8222-222222222222",
        time: "2026-07-16T15:00:00.000Z",
        description: "Apple",
        photoStorageRef: null,
        portionEstimate: "1 medium",
        tags: ["fruit"],
        confidenceLevel: "certain",
        notes: null,
      },
    });

    expect(withSnack.mealEvents).toHaveLength(1);
    expect(withSnack.mealEvents[0]?.notes).toBe("With berries");
    expect(withSnack.snackEvents).toHaveLength(1);
  });
});
