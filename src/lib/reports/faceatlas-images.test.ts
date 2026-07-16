import { describe, expect, it, vi } from "vitest";
import { compileReportData } from "./compile";
import { loadFaceAtlasReportImages } from "./faceatlas-images";
import { renderReportPdf } from "./pdf";
import type { RawProfileBundle } from "./types";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function bundle(imageStorageRef: string | null): RawProfileBundle {
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    userName: "Test Patient",
    userEmail: "patient@example.test",
    memberSince: "2026-07-01T00:00:00.000Z",
    sections: {},
    faceAtlasScans: [{
      scanDate: "2026-07-16T02:00:00.000Z",
      userLesionCount: 2,
      modelLesionCount: 2,
      agreementPct: 100,
      confidence: "moderate_confidence",
      hasRetainedImage: imageStorageRef !== null,
      imageStorageRef,
    }],
    treatmentPlans: [], treatmentCheckins: [], triggerHypotheses: [], forecastSummaries: [],
    evidenceCitations: [], dailyLogCount: 1, daysOfHistory: 1,
  };
}

const inclusion = {
  includeFaceAtlasPhotos: true,
  includeTreatmentDetails: true,
  includeSections: "all" as const,
};

describe("FaceAtlas report images", () => {
  it("performs no private object read when report-time inclusion is false", async () => {
    const loader = vi.fn().mockResolvedValue(png);
    const result = await loadFaceAtlasReportImages(bundle("face/user/scan.png"), false, loader);
    expect(loader).not.toHaveBeenCalled();
    expect(result.attachments).toEqual([]);
  });

  it("embeds a verified opted-in PNG and only then states that it is embedded", async () => {
    const loader = vi.fn().mockResolvedValue(png);
    const result = await loadFaceAtlasReportImages(bundle("face/user/scan.png"), true, loader);
    const report = compileReportData(bundle("face/user/scan.png"), inclusion, {
      embeddedCount: result.attachments.length,
      unavailableCount: result.unavailableCount,
    });
    const pdf = await renderReportPdf(report, result.attachments);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.attachments).toHaveLength(1);
    expect(report.faceAtlasHistory.notes?.join(" ")).toMatch(/1 verified scan image embedded/i);
    expect(pdf.toString("latin1")).toMatch(/\/Subtype\s*\/Image/);
  });

  it("reports opted-in missing or invalid images as unavailable and never as included", async () => {
    const missing = await loadFaceAtlasReportImages(bundle("face/user/missing.png"), true, async () => {
      throw new Error("not_found");
    });
    const invalid = await loadFaceAtlasReportImages(
      bundle("face/user/invalid.png"),
      true,
      async () => Buffer.from("not-an-image"),
    );
    for (const result of [missing, invalid]) {
      const report = compileReportData(bundle("face/user/scan.png"), inclusion, {
        embeddedCount: result.attachments.length,
        unavailableCount: result.unavailableCount,
      });
      const notes = report.faceAtlasHistory.notes?.join(" ") ?? "";
      expect(notes).toMatch(/no retained scan image could be verified and embedded/i);
      expect(notes).not.toMatch(/verified scan image embedded per/i);
    }
  });
});
