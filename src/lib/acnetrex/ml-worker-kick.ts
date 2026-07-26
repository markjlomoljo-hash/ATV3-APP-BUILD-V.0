import "server-only";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { processNextMlAnalysisJob, type MlWorkerOutcome } from "@/lib/acnetrex/ml-analysis-worker";

export type MlWorkerKickSource = "enqueue" | "status_read";

export type MlWorkerKickResult =
  | { kicked: false; reason: "worker_not_configured" }
  | { kicked: true; mode: "after" | "detached" };

const DEFAULT_KICK_MAX_JOBS = 2;
const DEFAULT_KICK_BUDGET_MS = 8_000;

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw ?? String(fallback));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

export function mlWorkerKickEnabled(): boolean {
  return process.env.ACNETREX_ML_WORKER_ENABLED === "true" && Boolean(process.env.ACNETREX_ML_WORKER_SECRET);
}

/**
 * One bounded worker pass: at most ML_WORKER_KICK_MAX_JOBS jobs, stopping as
 * soon as the queue is idle or the ML_WORKER_KICK_BUDGET_MS budget is spent.
 * Concurrency safety comes entirely from the worker's `for update skip locked`
 * claim semantics — concurrent kicks simply find nothing to claim.
 */
export async function runBoundedMlWorkerPass(options: {
  source: MlWorkerKickSource;
  now?: () => number;
}): Promise<MlWorkerOutcome[]> {
  const maxJobs = boundedInteger(process.env.ML_WORKER_KICK_MAX_JOBS, DEFAULT_KICK_MAX_JOBS, 1, 5);
  const budgetMs = boundedInteger(process.env.ML_WORKER_KICK_BUDGET_MS, DEFAULT_KICK_BUDGET_MS, 1_000, 30_000);
  const now = options.now ?? Date.now;
  const startedAt = now();
  const workerId = `ml-kick-${options.source}-${randomUUID()}`;
  const outcomes: MlWorkerOutcome[] = [];
  for (let index = 0; index < maxJobs; index += 1) {
    if (now() - startedAt >= budgetMs) break;
    const outcome = await processNextMlAnalysisJob({ workerId });
    outcomes.push(outcome);
    if (outcome.status === "idle" || outcome.status === "not_configured") break;
  }
  return outcomes;
}

/**
 * Opportunistic worker kick used by the public ML job routes so queued jobs
 * make progress without a scheduler. Fire-and-forget by contract:
 * - respects the same enablement gate as /api/internal/ml/worker
 *   (ACNETREX_ML_WORKER_ENABLED=true and ACNETREX_ML_WORKER_SECRET set);
 * - schedules the pass after the response via next/server `after()` when a
 *   request scope exists, otherwise runs a detached best-effort pass;
 * - never throws and never alters the caller's response — failures are
 *   logged and swallowed.
 */
export function kickMlWorker(source: MlWorkerKickSource): MlWorkerKickResult {
  if (!mlWorkerKickEnabled()) return { kicked: false, reason: "worker_not_configured" };

  const pass = () =>
    runBoundedMlWorkerPass({ source }).catch((error: unknown) => {
      console.warn(
        `[ml-worker-kick] opportunistic ${source} pass failed:`,
        error instanceof Error ? error.message : "unknown_error",
      );
    });

  try {
    after(pass);
    return { kicked: true, mode: "after" };
  } catch {
    // Outside a Next request scope `after()` throws synchronously; fall back
    // to a detached pass so the caller's response is never blocked or broken.
    void pass();
    return { kicked: true, mode: "detached" };
  }
}
