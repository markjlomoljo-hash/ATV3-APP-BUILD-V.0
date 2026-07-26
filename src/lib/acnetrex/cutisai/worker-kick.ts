// AcneTrex V3 — opportunistic CutisAI worker kick.
//
// Mirrors the ML worker kick: a bounded fire-and-forget pass scheduled after
// the enqueueing response so queued replies make progress without a
// scheduler. Unlike the ML kick, the deterministic tier needs no external
// service or secret — it only reads the user's own rows — so the kick is
// enabled by default and can be disabled with CUTISAI_WORKER_KICK_DISABLED.
import "server-only";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { processNextCutisAiReplyJob, type CutisAiWorkerOutcome } from "./worker";

export type CutisAiWorkerKickSource = "enqueue" | "status_read";

export type CutisAiWorkerKickResult =
  | { kicked: false; reason: "kick_disabled" }
  | { kicked: true; mode: "after" | "detached" };

const DEFAULT_KICK_MAX_JOBS = 2;
const DEFAULT_KICK_BUDGET_MS = 8_000;

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw ?? String(fallback));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

export function cutisAiWorkerKickEnabled(): boolean {
  return process.env.CUTISAI_WORKER_KICK_DISABLED !== "true";
}

/**
 * One bounded worker pass; concurrency safety comes entirely from the
 * worker's `for update skip locked` claim semantics.
 */
export async function runBoundedCutisAiWorkerPass(options: {
  source: CutisAiWorkerKickSource;
  now?: () => number;
}): Promise<CutisAiWorkerOutcome[]> {
  const maxJobs = boundedInteger(process.env.CUTISAI_WORKER_KICK_MAX_JOBS, DEFAULT_KICK_MAX_JOBS, 1, 5);
  const budgetMs = boundedInteger(process.env.CUTISAI_WORKER_KICK_BUDGET_MS, DEFAULT_KICK_BUDGET_MS, 1_000, 30_000);
  const now = options.now ?? Date.now;
  const startedAt = now();
  const workerId = `cutisai-kick-${options.source}-${randomUUID()}`;
  const outcomes: CutisAiWorkerOutcome[] = [];
  for (let index = 0; index < maxJobs; index += 1) {
    if (now() - startedAt >= budgetMs) break;
    const outcome = await processNextCutisAiReplyJob({ workerId });
    outcomes.push(outcome);
    if (outcome.status === "idle" || outcome.status === "not_configured") break;
  }
  return outcomes;
}

/**
 * Fire-and-forget: schedules a pass after the response via next/server
 * `after()` when a request scope exists, otherwise runs a detached pass.
 * Never throws and never alters the caller's response.
 */
export function kickCutisAiWorker(source: CutisAiWorkerKickSource): CutisAiWorkerKickResult {
  if (!cutisAiWorkerKickEnabled()) return { kicked: false, reason: "kick_disabled" };

  const pass = () =>
    runBoundedCutisAiWorkerPass({ source }).catch((error: unknown) => {
      console.warn(
        `[cutisai-worker-kick] opportunistic ${source} pass failed:`,
        error instanceof Error ? error.message : "unknown_error",
      );
    });

  try {
    after(pass);
    return { kicked: true, mode: "after" };
  } catch {
    void pass();
    return { kicked: true, mode: "detached" };
  }
}
