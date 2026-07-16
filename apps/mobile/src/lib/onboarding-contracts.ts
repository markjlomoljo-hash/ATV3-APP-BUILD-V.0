export const ACNE_ONSET_OPTIONS = [
  {
    label: "Within the last 6 months",
    value: "acute_recent_onset",
    interpretation: "Acute onset or recent flare pattern",
  },
  {
    label: "6–12 months ago",
    value: "subacute_recent_onset",
    interpretation: "Recent persistent pattern requiring timeline context",
  },
  {
    label: "1–2 years ago",
    value: "persistent_recent_history",
    interpretation: "Consistent breakout pattern",
  },
  {
    label: "3–5 years ago",
    value: "multi_year_persistent",
    interpretation: "Longitudinal acne history requiring trigger/treatment timeline",
  },
  {
    label: "More than 5 years ago",
    value: "long_term_persistent",
    interpretation: "Long-term acne course with possible chronicity",
  },
  {
    label: "Since early adolescence",
    value: "adolescent_persistent",
    interpretation: "Long-term adolescent/persistent pattern",
  },
  {
    label: "Since childhood",
    value: "childhood_onset_history",
    interpretation: "Early history requiring cautious context and provider guidance if concerning",
  },
  {
    label: "Adult-onset after age 18",
    value: "adult_onset",
    interpretation: "Adult-onset pattern requiring cautious contextual analysis",
  },
  {
    label: "Started after a product/routine change",
    value: "product_temporal_association",
    interpretation: "Product/routine change hypothesis, not confirmed causation",
  },
  {
    label: "Started after medication/treatment change",
    value: "medication_temporal_association",
    interpretation: "Medication/treatment timing hypothesis, not diagnosis",
  },
  {
    label: "Started after lifestyle/environment change",
    value: "lifestyle_environment_temporal_association",
    interpretation: "Lifestyle or environmental change hypothesis",
  },
  {
    label: "Comes and goes in episodes",
    value: "episodic_relapsing",
    interpretation: "Relapsing pattern requiring episode tracking",
  },
  {
    label: "Not sure",
    value: "unknown_onset",
    interpretation: "Known uncertainty retained for confidence calculation",
  },
] as const;

export const MEAL_FREQUENCY_OPTIONS = [
  { value: "1", label: "1 meal per day" },
  { value: "2", label: "2 meals per day" },
  { value: "3", label: "3 meals per day" },
  { value: "varies", label: "It varies a lot" },
  { value: "not_sure", label: "Not sure" },
  { value: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export const SNACK_TENDENCY_OPTIONS = [
  { value: "rarely_or_never", label: "Rarely or never" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "depends", label: "It depends" },
  { value: "not_sure", label: "Not sure" },
  { value: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export const SNACK_TYPE_OPTIONS = [
  { value: "sweets_chocolate", label: "Sweets/chocolate" },
  { value: "chips_processed", label: "Chips/processed snacks" },
  { value: "dairy", label: "Dairy snacks" },
  { value: "bread_pastries", label: "Bread/pastries" },
  { value: "fruit", label: "Fruit" },
  { value: "nuts", label: "Nuts" },
  { value: "protein", label: "Protein snacks" },
  { value: "sugary_drinks", label: "Sugary drinks" },
  { value: "caffeine_drinks", label: "Caffeine drinks" },
  { value: "user_specific", label: "User-specific snack" },
  { value: "not_sure", label: "Not sure" },
] as const;

export const SLEEP_AGE_RANGE_OPTIONS = [
  { value: "teen_13_17", label: "13–17 years" },
  { value: "adult_18_64", label: "18–64 years" },
  { value: "older_adult_65_plus", label: "65 years or older" },
  { value: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export const TYPICAL_SCHEDULE_OPTIONS = [
  { value: "regular", label: "Mostly regular" },
  { value: "variable", label: "Variable" },
  { value: "shift_work", label: "Shift work / rotating schedule" },
  { value: "not_sure", label: "Not sure" },
  { value: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export const USUAL_SLEEP_NEED_OPTIONS = [
  { value: null, label: "Use age-aware default" },
  { value: 7, label: "7 hours" },
  { value: 7.5, label: "7.5 hours" },
  { value: 8, label: "8 hours" },
  { value: 8.5, label: "8.5 hours" },
  { value: 9, label: "9 hours" },
] as const;

export type SleepAgeRange = (typeof SLEEP_AGE_RANGE_OPTIONS)[number]["value"];

export type SleepTargetConfiguration = {
  range: [number, number];
  workingTarget: number;
  source: "age_default" | "user_selected";
  ruleVersion: "sleep-target-v1";
};

export function deriveSleepTarget(
  ageRange: SleepAgeRange,
  userSelectedHours: number | null,
): SleepTargetConfiguration | null {
  const range: [number, number] | null = ageRange === "teen_13_17"
    ? [8, 10]
    : ageRange === "adult_18_64"
      ? [7, 9]
      : ageRange === "older_adult_65_plus"
        ? [7, 8]
        : null;
  if (!range) return null;

  const selected = userSelectedHours !== null && Number.isFinite(userSelectedHours)
    ? Math.min(range[1], Math.max(range[0], userSelectedHours))
    : null;
  return {
    range,
    workingTarget: selected ?? (range[0] + range[1]) / 2,
    source: selected === null ? "age_default" : "user_selected",
    ruleVersion: "sleep-target-v1",
  };
}

export type AcneOnsetValue = (typeof ACNE_ONSET_OPTIONS)[number]["value"];
export type MealFrequencyValue = (typeof MEAL_FREQUENCY_OPTIONS)[number]["value"];
export type SnackTendencyValue = (typeof SNACK_TENDENCY_OPTIONS)[number]["value"];
export type SnackTypeValue = (typeof SNACK_TYPE_OPTIONS)[number]["value"];
