/**
 * SleepDerm analysis wiring.
 *
 * Runs the deterministic on-device sleep engine over sleep logs the user has
 * actually recorded, then submits the job through the mobile ML coordinator
 * so the cloud pipeline can track it. Every state exposed here is honest:
 * no numbers are ever invented, and when the data or infrastructure is not
 * there, the specific fail-closed state says so.
 */

import {
  analyzeSleep,
  type SleepAnalysis,
  type SleepNight,
} from "../../../../packages/ml-local-runtime/src/deterministic/sleep";

import { mobileMlCoordinator, type MobileMlJobRequest } from "./ml";
import { isNetworkAvailable, isNetworkError } from "./network";
import { fetchRecentSleepLogs, type SleepLog } from "./daily-logs-service";

export type { SleepAnalysis };

export type CloudSubmissionState =
  | { status: "cloud_submitted"; jobId: string }
  | { status: "queued_for_cloud" }
  | { status: "api_not_configured" }
  | { status: "auth_required" }
  | { status: "submit_failed"; errorCode: string };

export type SleepAnalysisOutcome =
  | {
      status: "insufficient_data";
      usableNights: number;
      requiredNights: number;
      totalSleepLogs: number;
    }
  | { status: "model_unavailable"; errorCode: string }
  | {
      status: "analyzed";
      analysis: SleepAnalysis;
      usableNights: number;
      totalSleepLogs: number;
      submission: CloudSubmissionState;
    };

// The deterministic engine reports "partial" readiness from 2 nights up;
// below that it can only say insufficient_data, so we fail closed early.
export const MIN_NIGHTS_FOR_ANALYSIS = 2;
const ANALYSIS_WINDOW_DAYS = 14;

/** Normalize DB time values ("HH:MM" or "HH:MM:SS") to engine "HH:MM". */
function clockFrom(value: string | null): string | null {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(value);
  return match ? `${match[1]}:${match[2]}` : null;
}

async function submitToCloud(
  inputLogs: SleepLog[],
  analysis: SleepAnalysis
): Promise<CloudSubmissionState> {
  // Only real, computed values leave the device. Quality-derived scores or
  // any field the engine did not produce are never added here.
  const request: MobileMlJobRequest = {
    engine: "sleepderm",
    operation: "sleep_pattern_analysis",
    inputRecordRefs: inputLogs.map((log) => ({ table: "sleep_logs", id: log.id })),
    features: {
      nights: analysis.nights,
      averageDurationMinutes: analysis.averageDurationMinutes,
      bedtimeDriftMinutes: analysis.bedtimeDriftMinutes,
      wakeTimeDriftMinutes: analysis.wakeTimeDriftMinutes,
      regularityMinutes: analysis.regularityMinutes,
      readiness: analysis.readiness,
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
      // The network dropped mid-request: queue the job for replay instead of
      // losing it. The coordinator persists it in the encrypted offline store.
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
 * Run the deterministic sleep analysis over the user's real sleep logs from
 * the last 14 days. Only logs with both bed and wake times are usable; quick
 * logs that captured only a quality rating cannot support duration analysis
 * and are counted but excluded (reported honestly to the caller).
 */
export async function runSleepAnalysis(
  userId: string
): Promise<SleepAnalysisOutcome> {
  const logs = await fetchRecentSleepLogs(userId, ANALYSIS_WINDOW_DAYS);

  const usable: { log: SleepLog; night: SleepNight }[] = [];
  for (const log of logs) {
    const bedTime = clockFrom(log.sleep_time);
    const wakeTime = clockFrom(log.wake_time);
    if (bedTime && wakeTime) {
      usable.push({ log, night: { logDate: log.log_date, bedTime, wakeTime } });
    }
  }

  if (usable.length < MIN_NIGHTS_FOR_ANALYSIS) {
    return {
      status: "insufficient_data",
      usableNights: usable.length,
      requiredNights: MIN_NIGHTS_FOR_ANALYSIS,
      totalSleepLogs: logs.length,
    };
  }

  let analysis: SleepAnalysis;
  try {
    analysis = analyzeSleep(usable.map((entry) => entry.night));
  } catch (error) {
    // The engine refused the data (e.g. an out-of-range duration). No result
    // exists, so none is shown.
    return {
      status: "model_unavailable",
      errorCode:
        error instanceof Error ? error.message.slice(0, 120) : "sleep_engine_failed",
    };
  }

  const submission = await submitToCloud(
    usable.map((entry) => entry.log),
    analysis
  );

  return {
    status: "analyzed",
    analysis,
    usableNights: usable.length,
    totalSleepLogs: logs.length,
    submission,
  };
}
