import { describe, expect, it } from "vitest";
import {
  evaluateDermDietPreview,
  evaluateFaceAtlasPreview,
  evaluateReportPreview,
  evaluateSkinTwinPreview,
  evaluateSleepDermPreview,
  evaluateTaskCreditPreview,
  unavailableModuleAdapter,
} from "./module-adapters";

describe("module service adapters", () => {
  it("returns structured SleepDerm local features without cloud claims", () => {
    const result = evaluateSleepDermPreview([{ logDate: "2026-07-05", bedtime: "23:00", wakeTime: "06:30" }]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.durationMinutes).toBe(450);
      expect(result.metadata.runtimeMode).toBe("local_fallback");
      expect(result.metadata.modelName).toBeUndefined();
    }
  });

  it("keeps DermDiet missing meals as explicit feature gaps", () => {
    const result = evaluateDermDietPreview({
      logDate: "2026-07-05",
      expectedMeals: 3,
      entries: [{ type: "snack", category: "processed" }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.missingMealCount).toBe(3);
      expect(result.metadata.featuresMissing).toContain("complete meal baseline for the day");
    }
  });

  it("does not produce FaceAtlas inference when capture is incomplete", () => {
    const result = evaluateFaceAtlasPreview({
      angles: ["front"],
      analysisConsent: true,
      rawImageRetentionConsent: false,
      cameraPermission: "granted",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe("insufficient_data");
      expect(result.metadata?.runtimeMode).toBe("queued_for_cloud");
    }
  });

  it("blocks Skin Twin until source records are sufficient", () => {
    const result = evaluateSkinTwinPreview({
      faceAtlasScanCount: 0,
      skinOutcomeDays: 0,
      sleepLogDays: 0,
      foodLogDays: 0,
      treatmentCheckinDays: 0,
      selectedVariables: ["better_sleep"],
      rawPhotosAvailable: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe("insufficient_data");
      expect(result.metadata?.featuresMissing.length).toBeGreaterThan(0);
    }
  });

  it("keeps reports and task credit unavailable without workers or durable task records", () => {
    expect(
      evaluateReportPreview({
        profileComplete: true,
        hasLogs: true,
        hasFaceAtlas: true,
        hasTreatments: true,
        reportWorkerConfigured: false,
      }),
    ).toMatchObject({ ok: false, status: "not_configured" });

    expect(evaluateTaskCreditPreview({ source: "local_preview" })).toMatchObject({
      ok: false,
      status: "database_unavailable",
    });
  });

  it("returns shared unavailable results for modules blocked by external services", () => {
    expect(unavailableModuleAdapter("cutisai", "evidence_unavailable", "Evidence retrieval is unavailable.")).toMatchObject({
      ok: false,
      status: "evidence_unavailable",
    });
  });
});
