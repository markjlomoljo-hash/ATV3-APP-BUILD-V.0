/**
 * ClearPath — orchestrator over the pure engine mirror (clearpath-engine.ts).
 *
 * Fetches the user's real FaceAtlas outcome history, runs the deterministic
 * forecast-readiness engine, and — only when the engine reports "ready" —
 * submits the computed result through the mobile ML coordinator for cloud
 * tracking (engine "forecast", operation "readiness": both accepted by the
 * cloud jobs contract in src/lib/acnetrex/ml-analysis-jobs.ts).
 *
 * Outcome series rule (documented, deterministic): one slot per UTC calendar
 * day in the trailing window; a day's value is that day's latest
 * `face_atlas_scans.user_lesion_count`, else NaN — no imputation. See
 * buildDailyOutcomeSeries.
 */

import { supabase } from "./supabase";
import { mobileMlCoordinator, type MobileMlJobRequest } from "./ml";
import { isNetworkAvailable, isNetworkError } from "./network";
import type { CloudSubmissionState } from "./sleep-analysis";
import {
  analyzeForecastReadiness,
  buildDailyOutcomeSeries,
  CLEARPATH_HORIZON_DAYS,
  FORECAST_REQUIRED_SAMPLES,
  type ForecastReadiness,
  type ForecastReadinessReady,
} from "./clearpath-engine";

export * from "./clearpath-engine";

export interface ClearPathOutcome {
  readiness: ForecastReadiness;
  /** Days in the window that actually carry a recorded outcome. */
  daysWithOutcome: number;
  windowDays: number;
  /**
   * Cloud tracking for a ready result via the coordinator. Null when the
   * engine reported insufficient_data: there is no computed result to track.
   */
  submission: CloudSubmissionState | null;
}

async function submitReadyForecast(
  readiness: ForecastReadinessReady,
  sourceScanIds: string[]
): Promise<CloudSubmissionState> {
  // Only values the engine actually computed leave the device.
  const request: MobileMlJobRequest = {
    engine: "forecast",
    operation: "readiness",
    inputRecordRefs: sourceScanIds
      .slice(0, 100)
      .map((id) => ({ table: "face_atlas_scans", id })),
    features: {
      state: readiness.state,
      horizon_days: readiness.horizonDays,
      sample_count: readiness.sampleCount,
      coverage: readiness.coverage,
      deterministic_recent_direction: readiness.deterministicRecentDirection,
    },
    metadata: {
      source: "mobile_local_deterministic",
      computedAt: new Date().toISOString(),
    },
  };

  try {
    const networkAvailable = await isNetworkAvailable();
    const result = await mobileMlCoordinator.execute(request, { networkAvailable });
    if (result.mode === "cloud") {
      return { status: "cloud_submitted", jobId: result.jobId };
    }
    return { status: "queued_for_cloud" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "submit_failed";
    if (message === "api_not_configured") return { status: "api_not_configured" };
    if (message === "auth_required") return { status: "auth_required" };
    if (isNetworkError(error)) {
      try {
        const queued = await mobileMlCoordinator.execute(request, {
          networkAvailable: false,
        });
        if (queued.mode === "queued_for_cloud") return { status: "queued_for_cloud" };
      } catch {
        // fall through to the honest failure below
      }
    }
    return { status: "submit_failed", errorCode: message.slice(0, 120) };
  }
}

/**
 * Runs the 7-day readiness check over the user's real FaceAtlas outcome
 * history. Fails closed: with too little data the result is the engine's own
 * insufficient_data state with true progress numbers — never a fabricated
 * forecast.
 */
export async function runClearPathForecast(
  userId: string
): Promise<ClearPathOutcome> {
  const windowDays = FORECAST_REQUIRED_SAMPLES[CLEARPATH_HORIZON_DAYS];
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);

  const { data, error } = await supabase
    .from("face_atlas_scans")
    .select("id, scan_date, user_lesion_count")
    .eq("user_id", userId)
    .gte("scan_date", since.toISOString())
    .order("scan_date", { ascending: true })
    .limit(500);
  if (error) throw new Error(`clearpath_history_fetch_failed: ${error.message}`);

  const series = buildDailyOutcomeSeries(
    (data ?? []) as { id: string; scan_date: string; user_lesion_count: number | null }[],
    { windowDays }
  );
  const readiness = analyzeForecastReadiness({
    outcomes: series.map((point) => point.value),
    horizonDays: CLEARPATH_HORIZON_DAYS,
  });
  const daysWithOutcome = series.filter((point) =>
    Number.isFinite(point.value)
  ).length;

  const submission =
    readiness.state === "ready"
      ? await submitReadyForecast(
          readiness,
          series
            .map((point) => point.sourceScanId)
            .filter((id): id is string => id !== null)
        )
      : null;

  return { readiness, daysWithOutcome, windowDays, submission };
}
