import { describe, expect, it } from "vitest";

import { presentForecastOutput, presentSleepDermOutput } from "../../../apps/mobile/src/lib/ml-result-presentation";

describe("mobile SleepDerm result presentation", () => {
  it("renders only durable deterministic output fields with explicit units", () => {
    expect(presentSleepDermOutput({
      state: "ready",
      sample_count: 8,
      average_duration_hours: 7.25,
      regularity_index: 0.82,
      sleep_debt_hours: { "7d": 3.5 },
    })).toEqual([
      { label: "Analysis state", value: "ready" },
      { label: "Valid nights", value: "8" },
      { label: "Average sleep", value: "7.25 hours" },
      { label: "Regularity index", value: "0.82" },
      { label: "7-day sleep debt", value: "3.5 hours" },
    ]);
  });

  it("does not invent values when output is absent or malformed", () => {
    expect(presentSleepDermOutput(null)).toEqual([]);
    expect(presentSleepDermOutput({ state: "ready", sample_count: "many" })).toEqual([
      { label: "Analysis state", value: "ready" },
    ]);
  });
});

describe("mobile calibrated forecast result presentation", () => {
  it("renders only bounded predictive fields and makes the non-causal status explicit", () => {
    expect(presentForecastOutput({
      state: "ready",
      estimated_direction: "higher",
      direction_probability: 0.73,
      component_models: { structured: 0.69, residual_mlp: 0.75 },
      causal_claim: false,
    })).toEqual([
      { label: "Estimated next-window direction", value: "higher" },
      { label: "Calibrated probability", value: "73%" },
      { label: "Structured component", value: "69%" },
      { label: "Residual MLP component", value: "75%" },
      { label: "Interpretation", value: "Associational estimate; not causal or diagnostic" },
    ]);
  });

  it("does not render malformed or causal predictive claims", () => {
    expect(presentForecastOutput({
      estimated_direction: "certain cure",
      direction_probability: 4,
      causal_claim: true,
    })).toEqual([]);
  });
});
