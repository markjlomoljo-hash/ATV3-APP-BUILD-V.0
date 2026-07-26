import { describe, expect, it } from "vitest";

import {
  buildInsightWithUncertainty,
  buildUncertaintyMarker,
} from "../insight-uncertainty";

describe("buildUncertaintyMarker", () => {
  it("marks low confidence and unreliable below the minimum", () => {
    const marker = buildUncertaintyMarker({
      dataPointCount: 2,
      minDataPointsRequired: 3,
      windowDays: 30,
      dataPointLabel: "sleep logs",
    });
    expect(marker.confidence).toBe("low");
    expect(marker.basis).toBe("measured");
    expect(marker.caveat).toContain("Only 2 of the 3 sleep logs");
  });

  it("marks medium confidence at the minimum with sparse coverage", () => {
    const marker = buildUncertaintyMarker({
      dataPointCount: 5,
      minDataPointsRequired: 3,
      windowDays: 30,
      dataPointLabel: "sleep logs",
    });
    expect(marker.confidence).toBe("medium");
    expect(marker.caveat).toContain("5 sleep logs");
    expect(marker.caveat).toContain("17% of days");
  });

  it("requires >= 80% day coverage for high confidence", () => {
    const dense = buildUncertaintyMarker({
      dataPointCount: 25,
      minDataPointsRequired: 7,
      windowDays: 30,
      dataPointLabel: "check-ins",
    });
    expect(dense.confidence).toBe("high");

    const sparse = buildUncertaintyMarker({
      dataPointCount: 23,
      minDataPointsRequired: 7,
      windowDays: 30,
      dataPointLabel: "check-ins",
    });
    expect(sparse.confidence).toBe("medium");
  });
});

describe("buildInsightWithUncertainty", () => {
  it("fills the InsightWithUncertainty contract from real counts", () => {
    const insight = buildInsightWithUncertainty(4.2, {
      dataPointCount: 10,
      minDataPointsRequired: 3,
      windowDays: 30,
      dataPointLabel: "rated sleep logs",
    });
    expect(insight.data).toBe(4.2);
    expect(insight.dataPointCount).toBe(10);
    expect(insight.minDataPointsRequired).toBe(3);
    expect(insight.isReliable).toBe(true);
    expect(insight.uncertainty.basis).toBe("measured");
  });

  it("reports isReliable false below the minimum", () => {
    const insight = buildInsightWithUncertainty(0.5, {
      dataPointCount: 1,
      minDataPointsRequired: 7,
      windowDays: 30,
      dataPointLabel: "check-ins",
    });
    expect(insight.isReliable).toBe(false);
    expect(insight.uncertainty.confidence).toBe("low");
  });
});
