import { describe, expect, it } from "vitest";
import { buildCutisAiMemoryReadiness } from "./readiness";

describe("CutisAI persistent memory readiness", () => {
  it("reports missing memory tables without pretending memory is configured", () => {
    const readiness = buildCutisAiMemoryReadiness(["profiles", "ml_runtime_events"]);

    expect(readiness.ok).toBe(false);
    expect(readiness.status).toBe("memory_not_configured");
    expect(readiness.missingTables).toContain("user_memory_events");
    expect(readiness.evidenceRetrieval).toBe("evidence_unavailable");
  });

  it("reports ready only when all memory and lineage contracts are present", () => {
    const readiness = buildCutisAiMemoryReadiness([
      "user_memory_events",
      "user_memory_facts",
      "user_memory_summaries",
      "memory_retrieval_logs",
      "ml_analysis_jobs",
      "ml_analysis_results",
      "ml_model_versions",
      "ml_feature_snapshots",
      "intelligence_events",
      "cutisai_conversations",
    ]);

    expect(readiness.ok).toBe(true);
    expect(readiness.status).toBe("ready");
    expect(readiness.missingTables).toEqual([]);
  });
});
