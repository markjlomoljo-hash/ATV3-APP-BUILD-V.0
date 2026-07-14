import { describe, expect, it } from "vitest";
import { persistentMemoryTables } from "../services/infrastructure-health";
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
    const readiness = buildCutisAiMemoryReadiness(persistentMemoryTables);

    expect(readiness.ok).toBe(true);
    expect(readiness.status).toBe("ready");
    expect(readiness.missingTables).toEqual([]);
  });
});
