import { describe, expect, it } from "vitest";
import {
  calculateSleepDermFeatures,
  calculateTaskCredit,
  evaluateFaceAtlasCapture,
  evaluateReportReadiness,
  evaluateSkinTwinReadiness,
  summarizeDermDietDay,
} from "./computations";

describe("AcneTrex deterministic module computations", () => {
  it("calculates SleepDerm duration, debt, and midnight crossing without sleep-stage claims", () => {
    const features = calculateSleepDermFeatures([
      { logDate: "2026-07-01", bedtime: "23:15", wakeTime: "06:45" },
      { logDate: "2026-07-02", bedtime: "23:00", wakeTime: "07:15" },
      { logDate: "2026-07-03", bedtime: "22:45", wakeTime: "06:15" },
    ]);

    expect(features.crossedMidnight).toBe(true);
    expect(features.durationMinutes).toBe(450);
    expect(features.sleepDebtMinutes).toBe(30);
    expect(features.rollingDebt["3d"]).toBeGreaterThanOrEqual(0);
    expect(features.limitations.join(" ")).toMatch(/No sleep-stage inference/i);
  });

  it("keeps DermDiet missing meals explicit and separates snack sub-events", () => {
    const summary = summarizeDermDietDay({
      logDate: "2026-07-05",
      expectedMeals: 3,
      entries: [
        { type: "breakfast", category: "balanced" },
        { type: "snack", category: "sugary_snack" },
      ],
    });

    expect(summary.mealsLoggedCount).toBe(1);
    expect(summary.snacksLoggedCount).toBe(1);
    expect(summary.missingMealCount).toBe(2);
    expect(summary.readiness).toBe("insufficient_data");
    expect(summary.limitations.join(" ")).toMatch(/cannot be silently estimated/i);
  });

  it("requires consent and all five FaceAtlas angles before queueing cloud analysis", () => {
    expect(
      evaluateFaceAtlasCapture({
        angles: ["front", "left", "right", "chin_up", "forehead"],
        analysisConsent: true,
        rawImageRetentionConsent: false,
        cameraPermission: "granted",
        imageQualityAccepted: true,
      }),
    ).toMatchObject({
      readiness: "queued_for_cloud",
      missingAngles: [],
      storageMode: "derived_only",
    });

    expect(
      evaluateFaceAtlasCapture({
        angles: ["front"],
        analysisConsent: true,
        rawImageRetentionConsent: true,
        cameraPermission: "granted",
      }).readiness,
    ).toBe("insufficient_data");
  });

  it("blocks Skin Twin projections until required source records exist", () => {
    const readiness = evaluateSkinTwinReadiness({
      faceAtlasScanCount: 1,
      skinOutcomeDays: 3,
      sleepLogDays: 3,
      foodLogDays: 0,
      treatmentCheckinDays: 0,
      selectedVariables: ["better_sleep", "reduced_dairy", "treatment_adherence"],
      rawPhotosAvailable: false,
    });

    expect(readiness.readiness).toBe("insufficient_data");
    expect(readiness.visualizationMode).toBe("derived_only");
    expect(readiness.canEstimateDirection).toBe(false);
    expect(readiness.limitations.join(" ")).toMatch(/not a guaranteed/i);
  });

  it("keeps report generation unavailable when the worker is not configured", () => {
    expect(
      evaluateReportReadiness({
        profileComplete: true,
        hasLogs: true,
        hasFaceAtlas: true,
        hasTreatments: true,
        reportWorkerConfigured: false,
      }),
    ).toMatchObject({ readiness: "not_configured" });
  });

  it("does not award task points or streak eligibility from local preview state", () => {
    expect(calculateTaskCredit({ source: "local_preview" })).toMatchObject({
      status: "database_unavailable",
      points: 0,
      streakEligible: false,
    });

    expect(calculateTaskCredit({ source: "task", durableTaskId: "task_1", completedAt: "2026-07-05T07:00:00Z" }))
      .toMatchObject({
        status: "ready",
        points: 1,
        streakEligible: true,
      });
  });
});
