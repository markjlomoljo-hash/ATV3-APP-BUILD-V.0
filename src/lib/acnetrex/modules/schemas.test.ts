import { describe, expect, it } from "vitest";
import {
  cutisAiMessageSchema,
  dailyLogPayloadSchema,
  faceAtlasAnnotationSchema,
  faceAtlasCaptureSchema,
  skinTwinScenarioSchema,
} from "./schemas";

describe("AcneTrex module schemas", () => {
  it("validates broad daily logging payloads while rejecting malformed dates", () => {
    expect(dailyLogPayloadSchema.parse({ kind: "stress", logDate: "2026-07-05", values: { stressLevel: 6 } })).toMatchObject({
      kind: "stress",
    });
    expect(() => dailyLogPayloadSchema.parse({ kind: "stress", logDate: "07/05/2026", values: {} })).toThrow();
  });

  it("requires FaceAtlas consent and valid lesion annotation coordinates", () => {
    expect(faceAtlasCaptureSchema.parse({ angles: ["front", "left"], rawImageRetentionConsent: false, analysisConsent: true })).toMatchObject({
      analysisConsent: true,
    });
    expect(() =>
      faceAtlasAnnotationSchema.parse({
        scanId: "00000000-0000-0000-0000-000000000000",
        lesionType: "papule",
        zone: "left_cheek",
        x: 1.2,
        y: 0.5,
        userCertainty: 0.7,
      }),
    ).toThrow();
  });

  it("allows Skin Twin scenarios only through supported variables and windows", () => {
    expect(
      skinTwinScenarioSchema.parse({
        name: "Better sleep and routine consistency",
        window: "14d",
        variables: ["better_sleep", "routine_consistency"],
      }),
    ).toMatchObject({ window: "14d" });

    expect(() =>
      skinTwinScenarioSchema.parse({
        name: "Guaranteed clear skin",
        window: "tomorrow",
        variables: ["magic"],
      }),
    ).toThrow();
  });

  it("keeps CutisAI behind explicit tool requests and bounded messages", () => {
    expect(cutisAiMessageSchema.parse({ message: "What context is missing?", requestedTools: ["memory", "evidence"] })).toMatchObject({
      requestedTools: ["memory", "evidence"],
    });
    expect(() => cutisAiMessageSchema.parse({ message: "" })).toThrow();
  });
});
