/**
 * Treatment Protocol — pure domain logic (no expo/supabase imports, so the
 * repo-root vitest can execute it directly).
 *
 * Holds the plan schedule contract shared with the backend
 * (treatmentPlanStepSchema in src/lib/acnetrex/modules/schemas.ts), the
 * deterministic adherence engine mirror, and the documented derivation of
 * the engine's inputs from real persisted history. The impure service layer
 * (treatment-service.ts) re-exports everything here.
 */

// ─── Plan types ──────────────────────────────────────────────────────────────

export type PlanStepTime = "am" | "pm" | "both";

export interface TreatmentPlanStep {
  name: string;
  timeOfDay: PlanStepTime;
}

/** Parsed view over a `treatment_plans` row (schedule jsonb unpacked). */
export interface TreatmentPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string; // draft | active | paused | completed | abandoned
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  steps: TreatmentPlanStep[];
  activeIngredient: string | null;
  reviewDate: string | null;
  providerDirected: boolean;
}

const STEP_TIMES: readonly PlanStepTime[] = ["am", "pm", "both"];

/**
 * Defensive parse of the schedule jsonb written by the backend plan contract
 * ({ activeIngredient, reviewDate, providerDirected, steps }). Malformed
 * entries are dropped, never guessed at.
 */
export function parsePlanSchedule(schedule: unknown): {
  steps: TreatmentPlanStep[];
  activeIngredient: string | null;
  reviewDate: string | null;
  providerDirected: boolean;
} {
  const empty = {
    steps: [] as TreatmentPlanStep[],
    activeIngredient: null,
    reviewDate: null,
    providerDirected: false,
  };
  if (typeof schedule !== "object" || schedule === null || Array.isArray(schedule)) {
    return empty;
  }
  const record = schedule as Record<string, unknown>;
  const steps: TreatmentPlanStep[] = Array.isArray(record.steps)
    ? record.steps.flatMap((step) => {
        if (typeof step !== "object" || step === null) return [];
        const candidate = step as Record<string, unknown>;
        if (
          typeof candidate.name === "string" &&
          candidate.name.trim().length > 0 &&
          typeof candidate.timeOfDay === "string" &&
          (STEP_TIMES as readonly string[]).includes(candidate.timeOfDay)
        ) {
          return [{ name: candidate.name, timeOfDay: candidate.timeOfDay as PlanStepTime }];
        }
        return [];
      })
    : [];
  return {
    steps,
    activeIngredient:
      typeof record.activeIngredient === "string" && record.activeIngredient
        ? record.activeIngredient
        : null,
    reviewDate:
      typeof record.reviewDate === "string" && record.reviewDate
        ? record.reviewDate
        : null,
    providerDirected: record.providerDirected === true,
  };
}

/** Steps that apply to a given half of the day ("both" applies to each). */
export function stepsForTime(
  steps: TreatmentPlanStep[],
  time: "am" | "pm"
): TreatmentPlanStep[] {
  return steps.filter((step) => step.timeOfDay === time || step.timeOfDay === "both");
}

export function activePlanFrom(plans: TreatmentPlan[]): TreatmentPlan | null {
  return plans.find((plan) => plan.status === "active") ?? null;
}

// ─── Check-in vocabulary (server contract) ───────────────────────────────────

/** Server vocabulary from treatmentCheckinRequestSchema (plans.ts). */
export const PLAN_CHECKIN_STATUSES = [
  "used",
  "partial",
  "skipped",
  "delayed",
  "stopped",
] as const;

export type PlanCheckinStatus = (typeof PLAN_CHECKIN_STATUSES)[number];

/**
 * The ONE adherence rule shared by every surface that derives a ratio from
 * check-in history (the plan adherence engine here and the Insights summary
 * in daily-logs-service.fetchInsightsData — they must never disagree about
 * the same rows):
 * - "used" (server vocabulary above) is a completed application;
 * - "done" is the legacy pre-plan direct-insert vocabulary still present in
 *   rows persisted before the plan contract shipped — those are real
 *   completed applications too;
 * - partial/skipped/delayed/stopped are real records but NOT completed.
 */
export function isCompletedCheckinStatus(status: string): boolean {
  return status === "used" || status === "done";
}

// ─── Adherence engine (deterministic mirror) ─────────────────────────────────

export interface AdherenceInsufficient {
  state: "insufficient_data";
  featuresMissing: string[];
}

export interface AdherenceReady {
  state: "ready";
  adherenceRatio: number;
  supportState: "review_schedule_support" | "maintain";
  limitations: string[];
}

export type AdherenceResult = AdherenceInsufficient | AdherenceReady;

/**
 * Faithful mirror of `analyze_adherence`
 * (ml-service/acnetrex_ml/engines/treatment_adherence.py). If the Python
 * engine changes, this mirror must change with it.
 */
export function analyzeTreatmentAdherence(input: {
  scheduledCount: number | null;
  completedCount: number | null;
}): AdherenceResult {
  if (
    input.scheduledCount === null ||
    input.completedCount === null ||
    Math.trunc(input.scheduledCount) <= 0
  ) {
    return {
      state: "insufficient_data",
      featuresMissing: ["scheduled_count", "completed_count"],
    };
  }
  const ratio = Math.max(
    0,
    Math.min(1, Math.trunc(input.completedCount) / Math.trunc(input.scheduledCount))
  );
  return {
    state: "ready",
    adherenceRatio: Math.round(ratio * 10_000) / 10_000,
    supportState: ratio < 0.7 ? "review_schedule_support" : "maintain",
    limitations: [
      "This is a behavioral consistency summary, not medical advice.",
    ],
  };
}

export interface AdherenceInputs {
  scheduledCount: number | null;
  completedCount: number | null;
  windowStart: string;
  windowEnd: string;
}

/**
 * Derives the engine's inputs from real persisted history with a documented
 * deterministic rule:
 * - scheduled_count = calendar days the plan has been active inside the
 *   window: from max(plan start date, window start) through today,
 *   inclusive. Null when the plan has no started_at (nothing was scheduled)
 *   or starts in the future.
 * - completed_count = distinct check-in dates in that range whose status
 *   counts as a completed application per isCompletedCheckinStatus ("used",
 *   plus legacy "done" rows). partial/skipped/delayed/stopped days are real
 *   records but do not count as completed.
 */
export function deriveAdherenceInputs(
  plan: Pick<TreatmentPlan, "started_at">,
  checkins: { checkin_date: string; status: string }[],
  options: { windowDays?: number; today?: string } = {}
): AdherenceInputs {
  const windowDays = options.windowDays ?? 14;
  const today = options.today ?? new Date().toISOString().split("T")[0];
  const windowStartDate = new Date(`${today}T00:00:00.000Z`);
  windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (windowDays - 1));
  const windowStart = windowStartDate.toISOString().split("T")[0];

  if (!plan.started_at) {
    return {
      scheduledCount: null,
      completedCount: null,
      windowStart,
      windowEnd: today,
    };
  }

  const planStart = plan.started_at.slice(0, 10);
  const effectiveStart = planStart > windowStart ? planStart : windowStart;
  if (effectiveStart > today) {
    // Plan starts in the future: nothing has been scheduled yet.
    return {
      scheduledCount: null,
      completedCount: null,
      windowStart,
      windowEnd: today,
    };
  }

  const startMs = new Date(`${effectiveStart}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${today}T00:00:00.000Z`).getTime();
  const scheduledCount = Math.round((endMs - startMs) / 86_400_000) + 1;

  const completedDates = new Set(
    checkins
      .filter(
        (checkin) =>
          isCompletedCheckinStatus(checkin.status) &&
          checkin.checkin_date >= effectiveStart &&
          checkin.checkin_date <= today
      )
      .map((checkin) => checkin.checkin_date)
  );

  return {
    scheduledCount,
    completedCount: completedDates.size,
    windowStart: effectiveStart,
    windowEnd: today,
  };
}

/**
 * Cloud boundary for adherence, surfaced to the UI verbatim: the deterministic
 * engine also exists server-side, but the cloud jobs contract does not accept
 * it yet, so the result shown is on-device only and no cloud job exists.
 */
export const ADHERENCE_CLOUD_BOUNDARY =
  "Computed on-device by the deterministic adherence engine. The cloud ML jobs contract does not accept this engine yet, so no cloud job was created.";
