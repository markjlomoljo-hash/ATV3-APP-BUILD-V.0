import { describe, expect, it } from "vitest";
import {
  ACNE_ONSET_OPTIONS,
  MEAL_FREQUENCY_OPTIONS,
  SNACK_TENDENCY_OPTIONS,
  SNACK_TYPE_OPTIONS,
} from "../../../apps/mobile/src/lib/onboarding-contracts";

describe("PRD V1.5 mobile onboarding contracts", () => {
  it("preserves every required acne-onset label and structured value", () => {
    expect(ACNE_ONSET_OPTIONS.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: "Within the last 6 months", value: "acute_recent_onset" },
      { label: "6–12 months ago", value: "subacute_recent_onset" },
      { label: "1–2 years ago", value: "persistent_recent_history" },
      { label: "3–5 years ago", value: "multi_year_persistent" },
      { label: "More than 5 years ago", value: "long_term_persistent" },
      { label: "Since early adolescence", value: "adolescent_persistent" },
      { label: "Since childhood", value: "childhood_onset_history" },
      { label: "Adult-onset after age 18", value: "adult_onset" },
      {
        label: "Started after a product/routine change",
        value: "product_temporal_association",
      },
      {
        label: "Started after medication/treatment change",
        value: "medication_temporal_association",
      },
      {
        label: "Started after lifestyle/environment change",
        value: "lifestyle_environment_temporal_association",
      },
      { label: "Comes and goes in episodes", value: "episodic_relapsing" },
      { label: "Not sure", value: "unknown_onset" },
    ]);
    expect(ACNE_ONSET_OPTIONS.every((option) => option.interpretation.length > 0)).toBe(true);
  });

  it("preserves required meal and snack baseline answers", () => {
    expect(MEAL_FREQUENCY_OPTIONS.map((option) => option.label)).toEqual([
      "1 meal per day",
      "2 meals per day",
      "3 meals per day",
      "It varies a lot",
      "Not sure",
      "Prefer not to answer",
    ]);
    expect(SNACK_TENDENCY_OPTIONS.map((option) => option.label)).toEqual([
      "Rarely or never",
      "Sometimes",
      "Often",
      "It depends",
      "Not sure",
      "Prefer not to answer",
    ]);
    expect(SNACK_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      "Sweets/chocolate",
      "Chips/processed snacks",
      "Dairy snacks",
      "Bread/pastries",
      "Fruit",
      "Nuts",
      "Protein snacks",
      "Sugary drinks",
      "Caffeine drinks",
      "User-specific snack",
      "Not sure",
    ]);
  });
});
