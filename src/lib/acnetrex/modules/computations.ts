import type { ModuleReadiness } from "../module-result";
import { faceAtlasAngles, skinTwinVariableSchema } from "./schemas";
import type { z } from "zod";

export type SleepDermLog = {
  logDate: string;
  bedtime: string;
  wakeTime: string;
  targetMinutes?: number;
  wakeups?: number;
  manualDurationMinutes?: number;
  manualOverrideReason?: string;
};

export type SleepDermFeatures = {
  durationMinutes: number;
  sleepDebtMinutes: number;
  midpointMinutes: number;
  crossedMidnight: boolean;
  manualOverride: boolean;
  rollingDebt: {
    "3d": number | null;
    "7d": number | null;
    "14d": number | null;
    "30d": number | null;
  };
  circadianReadiness: ModuleReadiness;
  sleepRegularityReadiness: ModuleReadiness;
  limitations: string[];
};

function parseClock(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new Error("invalid_clock_time");
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function calculateSleepDermFeatures(logs: SleepDermLog[]): SleepDermFeatures {
  if (logs.length === 0) {
    throw new Error("sleep_logs_required");
  }

  const sorted = [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate));
  const latest = sorted[sorted.length - 1];
  const targetMinutes = latest.targetMinutes ?? 480;
  const start = parseClock(latest.bedtime);
  const end = parseClock(latest.wakeTime);
  const crossedMidnight = end <= start;
  const computedDuration = crossedMidnight ? end + 24 * 60 - start : end - start;
  const durationMinutes = latest.manualDurationMinutes ?? computedDuration;
  const sleepDebtMinutes = Math.max(0, targetMinutes - durationMinutes);
  const midpointMinutes = (start + Math.round(durationMinutes / 2)) % (24 * 60);
  const debts = sorted.map((log) => {
    const logStart = parseClock(log.bedtime);
    const logEnd = parseClock(log.wakeTime);
    const duration = log.manualDurationMinutes ?? (logEnd <= logStart ? logEnd + 24 * 60 - logStart : logEnd - logStart);
    return Math.max(0, (log.targetMinutes ?? 480) - duration);
  });

  const midpointValues = sorted.map((log) => {
    const logStart = parseClock(log.bedtime);
    const logEnd = parseClock(log.wakeTime);
    const duration = log.manualDurationMinutes ?? (logEnd <= logStart ? logEnd + 24 * 60 - logStart : logEnd - logStart);
    return (logStart + Math.round(duration / 2)) % (24 * 60);
  });
  const midpointSpread = midpointValues.length >= 3 ? Math.max(...midpointValues) - Math.min(...midpointValues) : null;

  return {
    durationMinutes,
    sleepDebtMinutes,
    midpointMinutes,
    crossedMidnight,
    manualOverride: latest.manualDurationMinutes !== undefined,
    rollingDebt: {
      "3d": sorted.length >= 3 ? average(debts.slice(-3)) : null,
      "7d": sorted.length >= 7 ? average(debts.slice(-7)) : null,
      "14d": sorted.length >= 14 ? average(debts.slice(-14)) : null,
      "30d": sorted.length >= 30 ? average(debts.slice(-30)) : null,
    },
    circadianReadiness:
      sorted.length < 7 ? "insufficient_data" : midpointSpread !== null && midpointSpread <= 90 ? "ready" : "insufficient_data",
    sleepRegularityReadiness: sorted.length >= 7 ? "ready" : "insufficient_data",
    limitations: [
      "No sleep-stage inference is made without wearable data.",
      ...(latest.manualDurationMinutes !== undefined && !latest.manualOverrideReason
        ? ["Manual duration override should include a reason before clinical review."]
        : []),
    ],
  };
}

export type DermDietEntry = {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  category?: "dairy" | "high_glycemic" | "processed" | "sugary_snack" | "caffeine" | "balanced";
  loggedAt?: string;
};

export type DermDietDay = {
  logDate: string;
  expectedMeals: number;
  entries: DermDietEntry[];
  markedComplete?: boolean;
};

export function summarizeDermDietDay(day: DermDietDay) {
  const mealEntries = day.entries.filter((entry) => entry.type !== "snack");
  const snackEntries = day.entries.filter((entry) => entry.type === "snack");
  const expectedMeals = Math.max(1, Math.min(8, Math.round(day.expectedMeals)));
  const mealCompletionRatio = Math.min(1, mealEntries.length / expectedMeals);
  const missingMealCount = Math.max(0, expectedMeals - mealEntries.length);
  const categoryExposure = day.entries.reduce<Record<string, number>>((counts, entry) => {
    if (entry.category) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    return counts;
  }, {});

  return {
    logDate: day.logDate,
    expectedMeals,
    mealsLoggedCount: mealEntries.length,
    snacksLoggedCount: snackEntries.length,
    mealCompletionRatio,
    missingMealCount,
    markedComplete: Boolean(day.markedComplete),
    readiness: day.markedComplete || missingMealCount === 0 ? ("ready" as const) : ("insufficient_data" as const),
    categoryExposure,
    limitations: [
      "Food entries are exposure context, not proof of acne causation.",
      ...(missingMealCount > 0 && !day.markedComplete ? ["Missing meals must stay explicit; they cannot be silently estimated."] : []),
    ],
  };
}

export type FaceAtlasCaptureDraft = {
  angles: string[];
  analysisConsent: boolean;
  rawImageRetentionConsent: boolean;
  cameraPermission: "granted" | "denied" | "prompt" | "native_device_required";
  imageQualityAccepted?: boolean;
};

export function evaluateFaceAtlasCapture(draft: FaceAtlasCaptureDraft) {
  const captured = new Set(draft.angles);
  const missingAngles = faceAtlasAngles.filter((angle) => !captured.has(angle));
  const readiness: ModuleReadiness = !draft.analysisConsent
    ? "consent_required"
    : missingAngles.length > 0
      ? "insufficient_data"
      : draft.cameraPermission === "denied"
        ? "consent_required"
        : draft.cameraPermission === "native_device_required"
          ? "not_configured"
          : draft.imageQualityAccepted === false
            ? "insufficient_data"
            : "queued_for_cloud";

  return {
    readiness,
    missingAngles,
    storageMode: draft.rawImageRetentionConsent ? "raw_and_derived" : "derived_only",
    nextAction:
      readiness === "queued_for_cloud"
        ? "Persist scan metadata and queue Cloud Run analysis."
        : "Complete capture consent, permissions, and five-angle requirements before analysis.",
    limitations: ["No lesion detection is produced by capture readiness."],
  };
}

export type SkinTwinVariable = z.infer<typeof skinTwinVariableSchema>;

export type SkinTwinReadinessInput = {
  faceAtlasScanCount: number;
  skinOutcomeDays: number;
  sleepLogDays: number;
  foodLogDays: number;
  treatmentCheckinDays: number;
  selectedVariables: SkinTwinVariable[];
  rawPhotosAvailable: boolean;
};

export function evaluateSkinTwinReadiness(input: SkinTwinReadinessInput) {
  const missing: string[] = [];

  if (input.faceAtlasScanCount < 2) missing.push("at least two FaceAtlas scans");
  if (input.skinOutcomeDays < 7) missing.push("seven skin outcome days");
  if (input.sleepLogDays < 7 && input.selectedVariables.some((variable) => variable.includes("sleep") || variable.includes("circadian"))) {
    missing.push("seven SleepDerm records for sleep variables");
  }
  if (
    input.foodLogDays < 7 &&
    input.selectedVariables.some((variable) => variable.includes("dairy") || variable.includes("glycemic") || variable.includes("snack"))
  ) {
    missing.push("seven DermDiet records for food variables");
  }
  if (
    input.treatmentCheckinDays < 7 &&
    input.selectedVariables.some((variable) => variable.includes("treatment") || variable.includes("dose"))
  ) {
    missing.push("seven treatment check-ins for treatment variables");
  }

  return {
    readiness: missing.length === 0 ? ("queued_for_cloud" as const) : ("insufficient_data" as const),
    missingInputs: missing,
    visualizationMode: input.rawPhotosAvailable ? ("observed_plus_derived" as const) : ("derived_only" as const),
    canEstimateDirection: missing.length === 0,
    limitations: [
      "Scenario output is not a guaranteed before/after prediction.",
      "Visual projection stays unavailable until a validated model returns a result.",
    ],
  };
}

export function evaluateReportReadiness(input: {
  profileComplete: boolean;
  hasLogs: boolean;
  hasFaceAtlas: boolean;
  hasTreatments: boolean;
  reportWorkerConfigured: boolean;
}) {
  const missingSections = [
    ...(!input.profileComplete ? ["professional profile"] : []),
    ...(!input.hasLogs ? ["daily logs"] : []),
    ...(!input.hasFaceAtlas ? ["FaceAtlas scans"] : []),
    ...(!input.hasTreatments ? ["treatment history"] : []),
  ];

  return {
    readiness: !input.reportWorkerConfigured
      ? ("not_configured" as const)
      : missingSections.length > 0
        ? ("insufficient_data" as const)
        : ("ready" as const),
    missingSections,
    limitations: ["Reports must disclose missing sections and avoid diagnosis or unsupported causation."],
  };
}

export function calculateTaskCredit(input: { durableTaskId?: string; completedAt?: string; source: "task" | "local_preview" }) {
  if (!input.durableTaskId || !input.completedAt || input.source !== "task") {
    return {
      status: "database_unavailable" as const,
      points: 0,
      streakEligible: false,
      reason: "Task credit requires a durable task completion record.",
    };
  }

  return {
    status: "ready" as const,
    points: 1,
    streakEligible: true,
    reason: "Credit is derived from a durable task completion record.",
  };
}
