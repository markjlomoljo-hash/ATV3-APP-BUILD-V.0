import {
  ACNE_ONSET_OPTIONS,
  type AcneOnsetValue,
  type MealFrequencyValue,
} from "./onboarding-contracts";

function expectedMealCount(value: MealFrequencyValue): number | null {
  return value === "1" || value === "2" || value === "3" ? Number(value) : null;
}

export function resolveMealFrequencyBaseline(
  currentProfile: Readonly<Record<string, unknown>>,
  persistedDailySnapshot: Readonly<Record<string, unknown>> | null,
): MealFrequencyValue | null {
  const value = (persistedDailySnapshot ?? currentProfile).meal_frequency_baseline;
  return value === "1" || value === "2" || value === "3" || value === "varies" ||
    value === "not_sure" || value === "prefer_not_to_answer"
    ? value
    : null;
}

export function buildAcneHistoryEdit(
  current: Readonly<Record<string, unknown>>,
  onset: AcneOnsetValue,
  detail: string,
): Record<string, unknown> {
  const option = ACNE_ONSET_OPTIONS.find((candidate) => candidate.value === onset);
  if (!option) throw new Error("invalid_acne_onset");
  return {
    ...current,
    onset_pattern: onset,
    onset_interpretation: option.interpretation,
    onset_detail: detail.trim() || null,
  };
}

export function buildLifestyleBaselineEdit(
  current: Readonly<Record<string, unknown>>,
  mealFrequency: MealFrequencyValue,
): Record<string, unknown> {
  return {
    ...current,
    meal_frequency_baseline: mealFrequency,
    expected_meal_count: expectedMealCount(mealFrequency),
  };
}
