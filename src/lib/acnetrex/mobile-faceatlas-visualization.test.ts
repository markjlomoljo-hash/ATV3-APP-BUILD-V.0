import { describe, expect, it } from "vitest";
import {
  buildObservedSkinViewModel,
  buildSkinTwinProjectionViewModel,
  type FaceAtlasScanDetail,
} from "../../../apps/mobile/src/lib/faceatlas-visualization";

const detail: FaceAtlasScanDetail = {
  scan: {
    id: "11111111-1111-4111-8111-111111111111",
    angle: "front",
    status: "completed",
    capturedAt: "2026-07-16T02:00:00.000Z",
    storagePath: "private/user/scan.jpg",
    rawImageDeletedAt: null,
    createdAt: "2026-07-16T02:00:00.000Z",
    updatedAt: "2026-07-16T02:05:00.000Z",
  },
  annotations: [
    {
      id: "a1", scanId: "11111111-1111-4111-8111-111111111111", lesionType: "papule",
      zone: "left_cheek", x: 0.25, y: 0.45, w: 0.05, h: 0.05, userCertainty: 0.9,
      source: "user", notes: null, createdAt: "2026-07-16T02:03:00.000Z",
    },
    {
      id: "a2", scanId: "11111111-1111-4111-8111-111111111111", lesionType: "comedone_closed",
      zone: "forehead", x: 0.55, y: 0.2, w: null, h: null, userCertainty: 0.7,
      source: "model", notes: null, createdAt: "2026-07-16T02:04:00.000Z",
    },
  ],
};

describe("mobile FaceAtlas and Skin Twin visualization", () => {
  it("preserves every persisted observed marker field", () => {
    const model = buildObservedSkinViewModel(detail);
    expect(model.label).toBe("Observed current state");
    expect(model.markers).toEqual([
      { id: "a1", zone: "left_cheek", lesionType: "papule", x: 0.25, y: 0.45, w: 0.05, h: 0.05, source: "user", certainty: 0.9 },
      { id: "a2", zone: "forehead", lesionType: "comedone_closed", x: 0.55, y: 0.2, w: null, h: null, source: "model", certainty: 0.7 },
    ]);
  });

  it("uses a neutral model and exposes no raw URI after raw-image deletion", () => {
    const model = buildObservedSkinViewModel({
      ...detail,
      scan: { ...detail.scan, rawImageDeletedAt: "2026-07-16T03:00:00.000Z" },
    }, "file:///authorized-private-copy.jpg");
    expect(model.visualMode).toBe("derived_neutral_model");
    expect(model.rawImageUri).toBeNull();
  });

  it("renders a completed sufficiently confident projection with required labels", () => {
    const model = buildSkinTwinProjectionViewModel({
      status: "completed",
      window: "30d",
      confidence: "moderate_confidence",
      simulation: { direction: "reduced inflammatory burden", zones: { left_cheek: "improving" } },
      uncertainty: { summary: "moderate" },
      sourceRecordRefs: [{ table: "face_scans", id: detail.scan.id }],
    });
    expect(model).toMatchObject({
      status: "ready",
      label: "Estimated scenario projection",
      window: "30d",
      direction: "reduced inflammatory burden",
      uncertainty: "moderate",
      confidence: "moderate_confidence",
      disclaimer: "Estimated from persisted inputs; not a guaranteed outcome.",
    });
  });

  it("keeps low-confidence projections abstract with no lesion coordinates", () => {
    const model = buildSkinTwinProjectionViewModel({
      status: "completed", window: "7d", confidence: "early_hypothesis",
      simulation: { direction: "uncertain", projected_markers: [{ x: 0.5, y: 0.5 }] },
      uncertainty: { level: "high" }, sourceRecordRefs: [],
    });
    expect(model.status).toBe("insufficient_data");
    expect(model.projectedMarkers).toEqual([]);
    expect(model.zoneDirections).toEqual([]);
    expect(model.explanation).toMatch(/low-confidence output stays abstract/i);
  });

  it("returns insufficient_data with zero markers when no completed scan exists", () => {
    const model = buildObservedSkinViewModel(null);
    expect(model.status).toBe("insufficient_data");
    expect(model.markers).toEqual([]);
    expect(model.limitation).toMatch(/no markers are inferred/i);
  });
});
