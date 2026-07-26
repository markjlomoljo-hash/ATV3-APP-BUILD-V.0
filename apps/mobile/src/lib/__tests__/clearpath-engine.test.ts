import { describe, expect, it } from "vitest";

import {
  analyzeForecastReadiness,
  buildDailyOutcomeSeries,
  FORECAST_REQUIRED_SAMPLES,
} from "../clearpath-engine";

describe("analyzeForecastReadiness (mirror of forecast.py)", () => {
  it("rejects unsupported horizons exactly like the reference", () => {
    expect(() =>
      analyzeForecastReadiness({ outcomes: [1, 2], horizonDays: 5 })
    ).toThrow("horizon_days must be 3, 7, 14, or 30");
  });

  it("reports insufficient_data with true progress numbers below the minimum", () => {
    const outcomes = [
      ...Array.from({ length: 5 }, (_, index) => index + 1),
      ...Array.from({ length: 23 }, () => Number.NaN),
    ];
    const result = analyzeForecastReadiness({ outcomes, horizonDays: 7 });
    expect(result).toEqual({
      state: "insufficient_data",
      horizonDays: 7,
      sampleCount: 5,
      minimumSamples: 28,
      coverage: Math.round((5 / 28) * 10_000) / 10_000,
      prediction: null,
    });
  });

  it("gates on 80% coverage even when the sample minimum is met", () => {
    // 28 valid samples but padded window drops coverage below 0.8.
    const outcomes = [
      ...Array.from({ length: 28 }, () => 3),
      ...Array.from({ length: 10 }, () => Number.NaN),
    ];
    const result = analyzeForecastReadiness({ outcomes, horizonDays: 7 });
    expect(result.state).toBe("insufficient_data");
  });

  it("never fabricates a prediction — prediction is null even when ready", () => {
    const outcomes = Array.from({ length: 28 }, () => 4);
    const result = analyzeForecastReadiness({ outcomes, horizonDays: 7 });
    expect(result.state).toBe("ready");
    expect(result.prediction).toBeNull();
    if (result.state !== "ready") return;
    expect(result.deterministicRecentDirection).toBe("stable");
    expect(result.limitations).toEqual([
      "This is a retrospective trend summary, not a forecast of future lesion counts.",
      "A validated forecasting model is not active.",
    ]);
  });

  it("derives direction from the trailing 7-sample slope", () => {
    const rising = [
      ...Array.from({ length: 21 }, () => 2),
      ...Array.from({ length: 7 }, (_, index) => 2 + index),
    ];
    const result = analyzeForecastReadiness({ outcomes: rising, horizonDays: 7 });
    if (result.state !== "ready") throw new Error("expected ready");
    expect(result.deterministicRecentDirection).toBe("increasing");

    const falling = [
      ...Array.from({ length: 21 }, () => 9),
      ...Array.from({ length: 7 }, (_, index) => 9 - index),
    ];
    const down = analyzeForecastReadiness({ outcomes: falling, horizonDays: 7 });
    if (down.state !== "ready") throw new Error("expected ready");
    expect(down.deterministicRecentDirection).toBe("decreasing");
  });

  it("uses the reference minimum-sample table", () => {
    expect(FORECAST_REQUIRED_SAMPLES).toEqual({ 3: 14, 7: 28, 14: 56, 30: 90 });
  });
});

describe("buildDailyOutcomeSeries", () => {
  it("builds one slot per calendar day with NaN for unrecorded days", () => {
    const series = buildDailyOutcomeSeries(
      [
        { id: "a", scan_date: "2026-07-24T09:00:00.000Z", user_lesion_count: 4 },
        { id: "b", scan_date: "2026-07-26T08:00:00.000Z", user_lesion_count: 2 },
      ],
      { windowDays: 3, today: "2026-07-26" }
    );
    expect(series.map((point) => point.date)).toEqual([
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ]);
    expect(series[0].value).toBe(4);
    expect(Number.isNaN(series[1].value)).toBe(true);
    expect(series[1].sourceScanId).toBeNull();
    expect(series[2]).toMatchObject({ value: 2, sourceScanId: "b" });
  });

  it("uses the latest scan of a day and ignores scans without a count", () => {
    const series = buildDailyOutcomeSeries(
      [
        { id: "early", scan_date: "2026-07-26T06:00:00.000Z", user_lesion_count: 9 },
        { id: "late", scan_date: "2026-07-26T18:00:00.000Z", user_lesion_count: 5 },
        { id: "uncounted", scan_date: "2026-07-25T12:00:00.000Z", user_lesion_count: null },
      ],
      { windowDays: 2, today: "2026-07-26" }
    );
    // A scan without a user count contributes nothing — no imputation.
    expect(Number.isNaN(series[0].value)).toBe(true);
    expect(series[1]).toMatchObject({ value: 5, sourceScanId: "late" });
  });
});
