import type { ModuleMetadata, ModuleReadiness, ModuleResult } from "../module-result";
import { unavailableResult } from "../module-result";
import {
  calculateSleepDermFeatures,
  calculateTaskCredit,
  evaluateFaceAtlasCapture,
  evaluateReportReadiness,
  evaluateSkinTwinReadiness,
  summarizeDermDietDay,
  type DermDietDay,
  type FaceAtlasCaptureDraft,
  type SkinTwinReadinessInput,
  type SleepDermLog,
} from "../modules/computations";

function metadata(moduleId: string, overrides: Partial<ModuleMetadata> = {}): ModuleMetadata {
  return {
    moduleId,
    generatedAt: new Date(0).toISOString(),
    runtimeMode: "local_fallback",
    confidence: "insufficient_data",
    inputRecordRefs: [],
    featuresUsed: [],
    featuresMissing: [],
    limitations: [],
    syncStatus: "not_applicable",
    ...overrides,
  };
}

export function evaluateSleepDermPreview(logs: SleepDermLog[]): ModuleResult<ReturnType<typeof calculateSleepDermFeatures>> {
  if (logs.length === 0) {
    return unavailableResult("sleepderm", "insufficient_data", "At least one validated sleep log is required.");
  }

  const data = calculateSleepDermFeatures(logs);
  return {
    ok: true,
    data,
    metadata: metadata("sleepderm", {
      featureSchemaVersion: "sleepderm_local_v1",
      featuresUsed: ["durationMinutes", "sleepDebtMinutes", "midpointMinutes", "rollingDebt"],
      featuresMissing: data.sleepRegularityReadiness === "ready" ? [] : ["7-day sleep regularity window"],
      limitations: data.limitations,
      confidence: data.sleepRegularityReadiness === "ready" ? "early_hypothesis" : "insufficient_data",
    }),
  };
}

export function evaluateDermDietPreview(day: DermDietDay): ModuleResult<ReturnType<typeof summarizeDermDietDay>> {
  const data = summarizeDermDietDay(day);
  return {
    ok: true,
    data,
    metadata: metadata("dermdiet", {
      featureSchemaVersion: "dermdiet_local_v1",
      featuresUsed: ["mealCompletionRatio", "snacksLoggedCount", "categoryExposure"],
      featuresMissing: data.readiness === "ready" ? [] : ["complete meal baseline for the day"],
      limitations: data.limitations,
      confidence: "insufficient_data",
    }),
  };
}

export function evaluateFaceAtlasPreview(
  draft: FaceAtlasCaptureDraft,
): ModuleResult<ReturnType<typeof evaluateFaceAtlasCapture>> {
  const data = evaluateFaceAtlasCapture(draft);
  if (data.readiness !== "queued_for_cloud") {
    return {
      ok: false,
      status: data.readiness,
      error: data.nextAction,
      metadata: metadata("face-atlas", {
        runtimeMode: "queued_for_cloud",
        featuresUsed: ["captureAngles", "analysisConsent", "rawImageRetentionConsent", "cameraPermission"],
        featuresMissing: data.missingAngles,
        limitations: data.limitations,
        syncStatus: "queued",
      }),
    };
  }

  return {
    ok: true,
    data,
    metadata: metadata("face-atlas", {
      runtimeMode: "queued_for_cloud",
      featuresUsed: ["captureAngles", "analysisConsent", "rawImageRetentionConsent", "cameraPermission"],
      limitations: data.limitations,
      syncStatus: "queued",
    }),
  };
}

export function evaluateSkinTwinPreview(
  input: SkinTwinReadinessInput,
): ModuleResult<ReturnType<typeof evaluateSkinTwinReadiness>> {
  const data = evaluateSkinTwinReadiness(input);

  if (data.readiness !== "queued_for_cloud") {
    return {
      ok: false,
      status: data.readiness,
      error: "Skin Twin cannot simulate until required source records exist.",
      metadata: metadata("skin-twin", {
        runtimeMode: "queued_for_cloud",
        featuresUsed: ["scenarioVariables", "sourceRecordCounts", "rawPhotoAvailability"],
        featuresMissing: data.missingInputs,
        limitations: data.limitations,
        syncStatus: "queued",
      }),
    };
  }

  return {
    ok: true,
    data,
    metadata: metadata("skin-twin", {
      runtimeMode: "queued_for_cloud",
      featuresUsed: ["scenarioVariables", "sourceRecordCounts", "rawPhotoAvailability"],
      limitations: data.limitations,
      syncStatus: "queued",
    }),
  };
}

export function evaluateReportPreview(input: Parameters<typeof evaluateReportReadiness>[0]) {
  const data = evaluateReportReadiness(input);
  if (data.readiness !== "ready") {
    return {
      ok: false as const,
      status: data.readiness,
      error: data.readiness === "not_configured" ? "Report worker is not configured." : "Report source data is incomplete.",
      metadata: metadata("reports", {
        featuresUsed: ["profileComplete", "hasLogs", "hasFaceAtlas", "hasTreatments", "reportWorkerConfigured"],
        featuresMissing: data.missingSections,
        limitations: data.limitations,
      }),
    };
  }

  return { ok: true as const, data, metadata: metadata("reports", { confidence: "early_hypothesis" }) };
}

export function evaluateTaskCreditPreview(input: Parameters<typeof calculateTaskCredit>[0]) {
  const data = calculateTaskCredit(input);
  if (data.status !== "ready") {
    return {
      ok: false as const,
      status: data.status,
      error: data.reason,
      metadata: metadata("tasks", {
        featuresUsed: ["durableTaskId", "completedAt", "source"],
        featuresMissing: ["durable task completion"],
        limitations: ["No streak, badge, rank, or pet progress is awarded from local preview state."],
      }),
    };
  }

  return { ok: true as const, data, metadata: metadata("tasks", { confidence: "early_hypothesis" }) };
}

export function unavailableModuleAdapter(moduleId: string, status: ModuleReadiness, reason: string) {
  return unavailableResult(moduleId, status === "ready" ? "not_configured" : status, reason);
}
