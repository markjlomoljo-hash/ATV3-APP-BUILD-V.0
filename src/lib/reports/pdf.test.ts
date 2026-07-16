import { describe, expect, it } from "vitest";
import { compileReportData } from "./compile";
import { REPORT_SIGNATURE_LABELS, renderReportPdf } from "./pdf";

describe("dermatologist report PDF", () => {
  it("renders a valid non-empty PDF and exposes the required clinician sign-off labels", async () => {
    const report = compileReportData(
      {
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
      },
      {
        includeFaceAtlasPhotos: false,
        includeTreatmentDetails: true,
        includeSections: "all",
      },
    );

    const pdf = await renderReportPdf(report);

    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(5_000);
    expect(REPORT_SIGNATURE_LABELS).toEqual(["Clinician signature", "Date"]);
  });
});
