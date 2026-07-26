import { describe, expect, it } from "vitest";
import { ReportInclusionOptions } from "@/types/profile";
import { compileReportData } from "./compile";
import { RawProfileBundle } from "./types";

const userId = "00000000-0000-0000-0000-000000000001";

const allInclusion: ReportInclusionOptions = {
  includeFaceAtlasPhotos: false,
  includeTreatmentDetails: true,
  includeSections: "all",
};

function emptyBundle(): RawProfileBundle {
  return {
    userId,
    userName: "AcneTrex Member",
    userEmail: "",
    memberSince: "2026-01-01T00:00:00.000Z",
    sections: {},
    faceAtlasScans: [],
    treatmentPlans: [],
    treatmentCheckins: [],
    triggerHypotheses: [],
    forecastSummaries: [],
    dailyLogCount: 0,
    daysOfHistory: 0,
  };
}

function populatedBundle(): RawProfileBundle {
  return {
    userId,
    userName: "Fixture Person",
    userEmail: "fixture@example.test",
    memberSince: "2025-01-05T00:00:00.000Z",
    sections: {
      skin_profile: {
        value: { skinType: "combination", undertone: "neutral", knownConditions: ["rosacea"] },
        version: 1,
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      acne_history: {
        value: { onsetAge: 15, priorSeverity: "moderate", patternNotes: "jawline flares" },
        version: 2,
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
    },
    faceAtlasScans: [
      {
        scanDate: "2026-06-01T09:00:00.000Z",
        userLesionCount: 4,
        modelLesionCount: 5,
        agreementPct: 80,
        confidence: "moderate",
        hasRetainedImage: false,
      },
    ],
    treatmentPlans: [
      {
        title: "Adapalene evening routine",
        description: "Nightly application",
        status: "active",
        startedAt: "2026-05-01T00:00:00.000Z",
        endedAt: null,
        schedule: { evening: true },
      },
    ],
    treatmentCheckins: [
      { checkinDate: "2026-06-10", status: "done", irritation: 2, notes: "mild dryness" },
    ],
    triggerHypotheses: [
      { triggerName: "Dairy", status: "monitoring", evidenceCount: 3, notes: null },
    ],
    forecastSummaries: [
      { window: "7d", status: "insufficient_data", summary: null, confidence: null },
    ],
    dailyLogCount: 21,
    daysOfHistory: 30,
  };
}

describe("compileReportData", () => {
  it("derives every populated section from real persisted values only", () => {
    const report = compileReportData(populatedBundle(), allInclusion);

    expect(report.secureRecordStatus).toBe("verified_user_records");
    expect(report.patientSummary.rows).toContainEqual({ label: "Skin type", value: "combination" });
    expect(report.lesionTrends.insufficientData).toBe(false);
    expect(report.lesionTrends.table?.rows[0]).toEqual([
      "2026-06-01",
      "4",
      "5",
      "80%",
      "moderate",
    ]);
    expect(report.adherenceTolerance.table?.rows[0]).toEqual([
      "2026-06-10",
      "done",
      "2",
      "mild dryness",
    ]);
    expect(report.triggerHypotheses.table?.rows[0]).toEqual(["Dairy", "monitoring", "3", ""]);
    expect(report.treatmentPlans.table?.rows[0][0]).toBe("Adapalene evening routine");
    expect(report.confidenceNotes.notes).toContain("Total daily logs on record: 21.");
  });

  it("marks every data-driven section insufficient for an empty bundle instead of inventing values", () => {
    const report = compileReportData(emptyBundle(), allInclusion);

    expect(report.secureRecordStatus).toBe("no_records_found");
    for (const section of [
      report.acneHistory,
      report.skinBarrier,
      report.lesionTrends,
      report.faceAtlasHistory,
      report.routineProducts,
      report.medicationTreatmentHistory,
      report.treatmentPlans,
      report.adherenceTolerance,
      report.allergiesReactions,
      report.lifestyleContext,
      report.triggerHypotheses,
      report.forecastSummaries,
    ]) {
      expect(section.insufficientData).toBe(true);
      expect(section.insufficientDataNote).toBeTruthy();
      expect(section.table).toBeUndefined();
    }
    expect(report.confidenceNotes.notes).toContain("Total daily logs on record: 0.");
    expect(report.patientSummary.rows).toContainEqual({
      label: "Skin type",
      value: "Not provided",
    });
  });

  it("honestly labels sections the user excluded rather than silently dropping them", () => {
    const report = compileReportData(populatedBundle(), {
      ...allInclusion,
      includeSections: [],
    });

    expect(report.acneHistory.insufficientData).toBe(true);
    expect(report.acneHistory.insufficientDataNote).toContain("Excluded from this report");
    // Non-selectable sections built from scans/check-ins are still real data.
    expect(report.lesionTrends.insufficientData).toBe(false);
  });

  it("records photo-consent exclusion in the FaceAtlas section notes", () => {
    const withoutPhotos = compileReportData(populatedBundle(), allInclusion);
    expect(withoutPhotos.faceAtlasHistory.notes?.[0]).toContain("excluded");

    const withPhotos = compileReportData(populatedBundle(), {
      ...allInclusion,
      includeFaceAtlasPhotos: true,
    });
    expect(withPhotos.faceAtlasHistory.notes?.[0]).toContain("explicit user consent");
  });

  it("labels treatment plans as excluded when treatment details are opted out", () => {
    const report = compileReportData(populatedBundle(), {
      ...allInclusion,
      includeTreatmentDetails: false,
    });
    expect(report.treatmentPlans.insufficientData).toBe(true);
    expect(report.treatmentPlans.insufficientDataNote).toContain("chose not to include");
  });
});
