import { describe, expect, it } from "vitest";
import {
  buildAcneHistoryEdit,
  buildLifestyleBaselineEdit,
  resolveMealFrequencyBaseline,
} from "../../../apps/mobile/src/lib/profile-baseline-editor";
import { combineFoodLogDateAndTime } from "../../../apps/mobile/src/lib/food-event-time";

describe("mobile Profile baseline editing", () => {
  it("changes structured onset while preserving unrelated acne history", () => {
    const current = { current_severity: "moderate", provider_note: "persist me" };
    const next = buildAcneHistoryEdit(current, "acute_recent_onset", "After relocation");
    expect(next).toMatchObject({
      current_severity: "moderate",
      provider_note: "persist me",
      onset_pattern: "acute_recent_onset",
      onset_interpretation: "Acute onset or recent flare pattern",
      onset_detail: "After relocation",
    });
    expect(current).toEqual({ current_severity: "moderate", provider_note: "persist me" });
  });

  it("changes future meal expectations while preserving sleep and snack baseline fields", () => {
    const current = {
      meal_frequency_baseline: "3",
      expected_meal_count: 3,
      snack_tendency: "sometimes",
      common_snack_types: ["fruit"],
      working_sleep_target: 8,
      typical_schedule: "regular",
    };
    const next = buildLifestyleBaselineEdit(current, "1");
    expect(next).toEqual({
      ...current,
      meal_frequency_baseline: "1",
      expected_meal_count: 1,
    });
    expect(current.meal_frequency_baseline).toBe("3");
    expect(current.expected_meal_count).toBe(3);
  });

  it("uses no numeric expectation for a variable or undisclosed baseline", () => {
    expect(buildLifestyleBaselineEdit({}, "varies")).toMatchObject({ expected_meal_count: null });
    expect(buildLifestyleBaselineEdit({}, "prefer_not_to_answer")).toMatchObject({ expected_meal_count: null });
  });

  it("keeps a historical daily snapshot while new days resolve the edited Profile baseline", () => {
    const historicalSnapshot = { meal_frequency_baseline: "3", expected_meal_count: 3 };
    const currentProfile = buildLifestyleBaselineEdit(historicalSnapshot, "1");
    expect(resolveMealFrequencyBaseline(currentProfile, historicalSnapshot)).toBe("3");
    expect(resolveMealFrequencyBaseline(currentProfile, null)).toBe("1");
  });

  it("stores meal and snack time on the selected historical log date", () => {
    const clock = new Date(2026, 6, 16, 15, 30, 45);
    const timestamp = combineFoodLogDateAndTime("2026-07-10", clock);
    const restored = new Date(timestamp);
    expect(restored.getFullYear()).toBe(2026);
    expect(restored.getMonth()).toBe(6);
    expect(restored.getDate()).toBe(10);
    expect(restored.getHours()).toBe(15);
    expect(restored.getMinutes()).toBe(30);
  });
});
