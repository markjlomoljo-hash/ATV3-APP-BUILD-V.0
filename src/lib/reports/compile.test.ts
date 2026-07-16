import { describe, expect, it } from "vitest";
import { compileReportData } from "./compile";
import type { RawProfileBundle } from "./types";

function bundle(overrides: Partial<RawProfileBundle> = {}): RawProfileBundle {
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    userName: "Test Patient",
    userEmail: "patient@example.test",
    memberSince: "2026-07-01T00:00:00.000Z",
    sections: {},
    faceAtlasScans: [],
    treatmentPlans: [],
    treatmentCheckins: [],
    triggerHypotheses: [],
    forecastSummaries: [],
    evidenceCitations: [],
    dailyLogCount: 0,
    daysOfHistory: 0,
    ...overrides,
  };
}

const allSections = {
  includeFaceAtlasPhotos: false,
  includeTreatmentDetails: true,
  includeSections: "all" as const,
};

describe("compileReportData", () => {
  it("renders the structured PRD onset response saved by mobile onboarding", () => {
    const report = compileReportData(
      bundle({
        sections: {
          acne_history: {
            value: {
              onset_pattern: "acute_recent_onset",
              onset_interpretation: "Acute onset or recent flare pattern",
              onset_detail: "Began after moving to a humid climate",
            },
            version: 1,
            updatedAt: "2026-07-16T00:00:00.000Z",
          },
        },
      }),
      allSections,
    );

    expect(report.acneHistory.insufficientData).toBe(false);
    expect(report.acneHistory.rows).toEqual(
      expect.arrayContaining([
        { label: "When did it start?", value: "Within the last 6 months" },
        { label: "Structured onset", value: "acute_recent_onset" },
        { label: "Historical interpretation", value: "Acute onset or recent flare pattern" },
        { label: "Additional detail", value: "Began after moving to a humid climate" },
      ]),
    );
  });

  it("formats persisted lifestyle arrays without object coercion", () => {
    const report = compileReportData(
      bundle({
        sections: {
          lifestyle_baseline: {
            value: {
              meal_frequency_baseline: "3",
              common_snack_types: ["fruit", "nuts"],
            },
            version: 1,
            updatedAt: null,
          },
        },
      }),
      allSections,
    );

    expect(report.lifestyleContext.rows).toEqual(
      expect.arrayContaining([
        { label: "Meal frequency baseline", value: "3 meals per day" },
        { label: "Common snack types", value: "fruit, nuts" },
      ]),
    );
    expect(report.lifestyleContext.rows?.some((row) => row.value === "[object Object]")).toBe(false);
  });

  it("states exact evidence requirements instead of inventing clinical metrics", () => {
    const report = compileReportData(bundle(), allSections);

    expect(report.currentDiagnostics.insufficientData).toBe(true);
    expect(report.currentDiagnostics.insufficientDataNote).toContain("completed FaceAtlas scan");
    expect(report.currentDiagnostics.insufficientDataNote).toContain("validated CHI");
    expect(report.evidenceCitations.insufficientData).toBe(true);
    expect(report.evidenceCitations.insufficientDataNote).toContain("persisted citation");
  });
});
