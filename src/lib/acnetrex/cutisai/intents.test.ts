import { describe, expect, it } from "vitest";
import { findModuleMentionedIn, matchCutisAiIntent } from "./intents";

describe("CutisAI deterministic intent matching", () => {
  it("matches capability questions before any data-lookup keyword", () => {
    expect(matchCutisAiIntent("What can you do?").intentId).toBe("capability_query");
    expect(matchCutisAiIntent("are you an AI?").intentId).toBe("capability_query");
    expect(matchCutisAiIntent("how do you work").intentId).toBe("capability_query");
  });

  it("routes module explanation questions to the curated module reference", () => {
    const match = matchCutisAiIntent("What is SleepDerm?");
    expect(match.intentId).toBe("module_explanation");
    if (match.intentId === "module_explanation") {
      expect(match.module.id).toBe("sleepderm");
    }
  });

  it("matches modules by hyphenated id spoken with spaces", () => {
    const match = matchCutisAiIntent("explain face atlas to me");
    expect(match.intentId).toBe("module_explanation");
    if (match.intentId === "module_explanation") {
      expect(match.module.id).toBe("face-atlas");
    }
  });

  it("prefers a data lookup when no module is named", () => {
    expect(matchCutisAiIntent("explain my sleep this week").intentId).toBe("sleep_summary");
    expect(matchCutisAiIntent("how is my streak").intentId).toBe("streak_status");
    expect(matchCutisAiIntent("show my food logs").intentId).toBe("food_summary");
    expect(matchCutisAiIntent("any triggers found?").intentId).toBe("trigger_summary");
    expect(matchCutisAiIntent("my treatment check-ins").intentId).toBe("treatment_adherence");
    expect(matchCutisAiIntent("what does my forecast say").intentId).toBe("forecast_status");
    expect(matchCutisAiIntent("list my scans").intentId).toBe("scan_summary");
    expect(matchCutisAiIntent("what do you remember about me").intentId).toBe("memory_recall");
  });

  it("declares evidence sources on every registry intent", () => {
    const match = matchCutisAiIntent("how is my streak");
    expect(match.intentId).toBe("streak_status");
    if (match.intentId === "streak_status") {
      expect(match.definition.evidenceSources).toEqual([
        { kind: "user_records", table: "gamification" },
        { kind: "user_records", table: "user_badges" },
      ]);
    }
  });

  it("classifies unmatched questions as outside the evidence base", () => {
    expect(matchCutisAiIntent("what stocks should I buy").intentId).toBe("outside_evidence_base");
    expect(matchCutisAiIntent("write me a poem").intentId).toBe("outside_evidence_base");
    expect(matchCutisAiIntent("").intentId).toBe("outside_evidence_base");
    expect(matchCutisAiIntent("   ").intentId).toBe("outside_evidence_base");
  });

  it("finds curated modules by exact name substring only", () => {
    expect(findModuleMentionedIn("tell me about TriggerGraph")?.id).toBe("triggergraph");
    expect(findModuleMentionedIn("random unrelated text")).toBeUndefined();
  });
});
