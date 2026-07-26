import { describe, expect, it } from "vitest";

import {
  confidenceBadge,
  mergeScanTimeline,
  statusBadge,
} from "../faceatlas-history";
import type {
  FaceAtlasScanSummary,
  FaceScanRecord,
} from "../faceatlas-service";

function capture(id: string, capturedAt: string): FaceScanRecord {
  return {
    id,
    user_id: "u",
    captured_at: capturedAt,
    angle: "front",
    storage_path: null,
    image_quality: null,
    oiliness_estimate: null,
    lesion_counts: null,
    labels: null,
    user_certainty: null,
    model_confidence: null,
    raw_image_deleted_at: null,
    status: "pending_upload",
    notes: null,
    created_at: capturedAt,
    updated_at: capturedAt,
  };
}

function summary(id: string, scanDate: string): FaceAtlasScanSummary {
  return {
    id,
    user_id: "u",
    scan_date: scanDate,
    angles: [],
    user_lesion_count: null,
    model_lesion_count: null,
    agreement_pct: null,
    oiliness_user: null,
    oiliness_model: null,
    confidence: "insufficient_data",
    image_storage_ref: null,
    created_at: scanDate,
  };
}

describe("mergeScanTimeline", () => {
  it("interleaves both tables into one newest-first timeline", () => {
    const timeline = mergeScanTimeline(
      [capture("c1", "2026-07-20T10:00:00Z"), capture("c2", "2026-07-26T10:00:00Z")],
      [summary("s1", "2026-07-23T00:00:00Z")]
    );
    expect(
      timeline.map((entry) => `${entry.kind}:${entry.scan.id}`)
    ).toEqual(["capture:c2", "summary:s1", "capture:c1"]);
  });

  it("keeps the raw capture before the summary on date ties", () => {
    const timeline = mergeScanTimeline(
      [capture("c1", "2026-07-26T00:00:00Z")],
      [summary("s1", "2026-07-26T00:00:00Z")]
    );
    expect(timeline[0].kind).toBe("capture");
  });
});

describe("confidenceBadge", () => {
  it("only grants green to high_confidence", () => {
    expect(confidenceBadge("high_confidence").textColor).toBe("#047857");
    expect(confidenceBadge("moderate_confidence").textColor).toBe("#92400e");
    expect(confidenceBadge("early_hypothesis").textColor).toBe("#92400e");
  });

  it("renders insufficient_data as neutral, not amber or green", () => {
    expect(confidenceBadge("insufficient_data")).toEqual({
      color: "#f1f5f9",
      textColor: "#475569",
    });
  });

  it("never maps an unknown confidence value to green", () => {
    // The old heuristic rendered anything != insufficient_data as green.
    for (const unknown of ["totally_new_value", "", "complete", "HIGH"]) {
      const badge = confidenceBadge(unknown);
      expect(badge.textColor).not.toBe("#047857");
      expect(badge).toEqual({ color: "#f1f5f9", textColor: "#475569" });
    }
  });
});

describe("statusBadge", () => {
  it("maps known statuses explicitly and unknowns to neutral", () => {
    expect(statusBadge("complete").textColor).toBe("#047857");
    expect(statusBadge("pending_upload").textColor).toBe("#92400e");
    expect(statusBadge("failed").textColor).toBe("#dc2626");
    expect(statusBadge("mystery_status")).toEqual({
      color: "#f1f5f9",
      textColor: "#475569",
    });
  });
});
