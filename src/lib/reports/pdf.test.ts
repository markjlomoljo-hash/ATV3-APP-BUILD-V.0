import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ReportInclusionOptions } from "@/types/profile";
import { compileReportData } from "./compile";
import { renderReportPdf } from "./pdf";
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
    ...emptyBundle(),
    userName: "Fixture Person",
    userEmail: "fixture@example.test",
    memberSince: "2025-01-05T00:00:00.000Z",
    sections: {
      skin_profile: {
        value: { skinType: "combination", undertone: "neutral", knownConditions: ["rosacea"] },
        version: 1,
        updatedAt: "2026-06-01T00:00:00.000Z",
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
    triggerHypotheses: [
      { triggerName: "Dairy", status: "monitoring", evidenceCount: 3, notes: null },
    ],
    dailyLogCount: 21,
    daysOfHistory: 30,
  };
}

/**
 * Extract the text shown by the PDF's content streams. pdfkit deflates each
 * content stream and writes text as hex show-strings inside `[...] TJ`
 * operators (split by kerning), so inflating and re-joining the hex runs of
 * each TJ array reconstructs the literal rendered strings.
 */
function extractPdfText(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let content = "";
  for (let match = streamRe.exec(raw); match !== null; match = streamRe.exec(raw)) {
    const body = Buffer.from(match[1], "latin1");
    try {
      content += `${inflateSync(body).toString("latin1")}\n`;
    } catch {
      content += `${match[1]}\n`;
    }
  }

  const lines: string[] = [];
  const tjRe = /\[((?:<[0-9a-fA-F]+>|[^\]])*)\]\s*TJ/g;
  for (let match = tjRe.exec(content); match !== null; match = tjRe.exec(content)) {
    const hexRuns = match[1].match(/<[0-9a-fA-F]+>/g) ?? [];
    lines.push(
      hexRuns.map((run) => Buffer.from(run.slice(1, -1), "hex").toString("latin1")).join(""),
    );
  }
  // Wrapped lines split a phrase across TJ arrays at word boundaries (and may
  // keep the trailing space), so join with a space and collapse runs to make
  // rendered phrases reliably matchable as substrings.
  return lines.join(" ").replace(/\s+/g, " ");
}

describe("renderReportPdf", () => {
  it("renders a genuine PDF containing the user's real persisted data", async () => {
    const report = compileReportData(populatedBundle(), allInclusion);
    const pdf = await renderReportPdf(report);

    // A real PDF artifact, not a placeholder blob.
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("%%EOF");
    expect(pdf.length).toBeGreaterThan(1000);

    const text = extractPdfText(pdf);
    expect(text).toContain("AcneTrex Skin Intelligence");
    expect(text).toContain(`Report ID: ${report.reportId}`);
    expect(text).toContain("Status: Verified user records");
    expect(text).toContain("PATIENT PROFILE SUMMARY");
    // Values below exist only in the fixture bundle — proving the PDF body is
    // derived from the compiled data, not from a static template.
    expect(text).toContain("combination");
    expect(text).toContain("2026-06-01");
    expect(text).toContain("80%");
    expect(text).toContain("Adapalene evening routine");
    expect(text).toContain("Dairy");
    expect(text).toContain("Total daily logs on record: 21.");
  });

  it("renders honest 'no data' sections for an empty bundle without fabricating values", async () => {
    const report = compileReportData(emptyBundle(), allInclusion);
    const pdf = await renderReportPdf(report);

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    const text = extractPdfText(pdf);
    expect(text).toContain("Status: No records found");
    expect(text).toContain("Insufficient data");
    expect(text).toContain("Total daily logs on record: 0.");
    // Nothing from a non-existent history may appear.
    expect(text).not.toContain("Dairy");
    expect(text).not.toContain("Adapalene");
    expect(text).not.toContain("80%");
  });
});
