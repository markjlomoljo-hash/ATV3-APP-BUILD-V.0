/**
 * ClearPath — pure forecast-readiness engine mirror (no expo/supabase
 * imports, so the repo-root vitest can execute it directly).
 *
 * `analyzeForecastReadiness` is a faithful TypeScript mirror of the Python
 * reference engine `ml-service/acnetrex_ml/engines/forecast.py`
 * (analyze_forecast_readiness): same horizon table, same 80% coverage gate,
 * same trailing-window slope, same limitations. If the Python engine
 * changes, this mirror must change with it.
 *
 * There is NO forecast here. The engine's own contract returns
 * `prediction: null` in every state ("A validated forecasting model is not
 * active"), and this module never substitutes one.
 */

// ─── Engine mirror ───────────────────────────────────────────────────────────

export type ForecastHorizonDays = 3 | 7 | 14 | 30;

/** Mirrors the `required` table in analyze_forecast_readiness. */
export const FORECAST_REQUIRED_SAMPLES: Record<ForecastHorizonDays, number> = {
  3: 14,
  7: 28,
  14: 56,
  30: 90,
};

export interface ForecastReadinessInsufficient {
  state: "insufficient_data";
  horizonDays: ForecastHorizonDays;
  sampleCount: number;
  minimumSamples: number;
  coverage: number;
  prediction: null;
}

export interface ForecastReadinessReady {
  state: "ready";
  horizonDays: ForecastHorizonDays;
  sampleCount: number;
  coverage: number;
  deterministicRecentDirection: "stable" | "increasing" | "decreasing";
  prediction: null;
  limitations: string[];
}

export type ForecastReadiness =
  | ForecastReadinessInsufficient
  | ForecastReadinessReady;

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Mirrors `_slope` in forecast.py (least-squares slope, x = 0..n-1). */
function slope(values: number[]): number {
  const x = values.map((_, index) => index);
  const meanX = x.reduce((sum, value) => sum + value, 0) / x.length;
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
  const denominator = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const numerator = x.reduce(
    (sum, value, index) => sum + (value - meanX) * (values[index] - meanY),
    0
  );
  return numerator / denominator;
}

/** Deterministic mirror of `analyze_forecast_readiness` (forecast.py). */
export function analyzeForecastReadiness(input: {
  /** Chronological (oldest first); NaN marks a day without a recorded outcome. */
  outcomes: number[];
  horizonDays: number;
}): ForecastReadiness {
  const horizon = input.horizonDays as ForecastHorizonDays;
  const required = FORECAST_REQUIRED_SAMPLES[horizon];
  if (required === undefined) {
    throw new Error("horizon_days must be 3, 7, 14, or 30");
  }

  const valid = input.outcomes.filter((value) => Number.isFinite(value));
  const coverage =
    input.outcomes.length > 0 ? valid.length / input.outcomes.length : 0;

  if (valid.length < required || coverage < 0.8) {
    return {
      state: "insufficient_data",
      horizonDays: horizon,
      sampleCount: valid.length,
      minimumSamples: required,
      coverage: round4(coverage),
      prediction: null,
    };
  }

  const window = Math.min(7, valid.length);
  const recentSlope = slope(valid.slice(-window));
  const direction =
    Math.abs(recentSlope) < 0.05
      ? "stable"
      : recentSlope > 0
        ? "increasing"
        : "decreasing";

  return {
    state: "ready",
    horizonDays: horizon,
    sampleCount: valid.length,
    coverage: round4(coverage),
    deterministicRecentDirection: direction,
    prediction: null,
    limitations: [
      "This is a retrospective trend summary, not a forecast of future lesion counts.",
      "A validated forecasting model is not active.",
    ],
  };
}

// ─── Outcome series from real persisted data ─────────────────────────────────

export interface DailyOutcomePoint {
  /** UTC calendar day, YYYY-MM-DD. */
  date: string;
  /** Recorded value or NaN when no outcome exists for the day. */
  value: number;
  /** face_atlas_scans row id the value came from, when one exists. */
  sourceScanId: string | null;
}

/**
 * Builds the fixed-length daily series the engine consumes. One slot per UTC
 * calendar day ending today; a day's value is the latest scan's
 * user_lesion_count for that day, else NaN (no imputation — missing days
 * count against coverage exactly like the Python reference's non-finite
 * handling). Pure and unit-tested.
 */
export function buildDailyOutcomeSeries(
  scans: { id: string; scan_date: string; user_lesion_count: number | null }[],
  options: { windowDays: number; today?: string }
): DailyOutcomePoint[] {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const byDay = new Map<string, { id: string; scanDate: string; value: number }>();
  for (const scan of scans) {
    if (scan.user_lesion_count === null) continue;
    const day = scan.scan_date.slice(0, 10);
    const existing = byDay.get(day);
    if (!existing || scan.scan_date > existing.scanDate) {
      byDay.set(day, {
        id: scan.id,
        scanDate: scan.scan_date,
        value: scan.user_lesion_count,
      });
    }
  }

  const points: DailyOutcomePoint[] = [];
  for (let offset = options.windowDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const day = date.toISOString().slice(0, 10);
    const recorded = byDay.get(day);
    points.push({
      date: day,
      value: recorded ? recorded.value : Number.NaN,
      sourceScanId: recorded ? recorded.id : null,
    });
  }
  return points;
}

// ─── Weather boundary ────────────────────────────────────────────────────────

/**
 * Honest boundary: no consented weather provider is configured in this build.
 * The repo has a `weather_snapshots` table and a `weather_alert_notifications`
 * consent, but no mobile weather-fetch contract and no provider credentials
 * (`WEATHER_API_KEY` is unset in .env.example). Until a consented provider is
 * wired, ClearPath must say weather context is not connected — never render
 * fabricated weather.
 */
export const WEATHER_CONTEXT = {
  status: "not_connected" as const,
  detail:
    "Weather context is not connected in this build. No weather provider is configured, so no weather data is shown or used.",
};

export const CLEARPATH_HORIZON_DAYS: ForecastHorizonDays = 7;
