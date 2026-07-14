import { persistentMemoryTables } from "../services/infrastructure-health";

export type CutisAiMemoryReadiness = {
  ok: boolean;
  status: "ready" | "memory_not_configured";
  expectedTables: string[];
  presentTables: string[];
  missingTables: string[];
  evidenceRetrieval: "ready" | "evidence_unavailable";
  limitations: string[];
};

export function buildCutisAiMemoryReadiness(tableNames: Iterable<string>): CutisAiMemoryReadiness {
  const present = new Set(Array.from(tableNames));
  const expectedTables = [...persistentMemoryTables];
  const presentTables = expectedTables.filter((table) => present.has(table));
  const missingTables = expectedTables.filter((table) => !present.has(table));
  const ok = missingTables.length === 0;

  return {
    ok,
    status: ok ? "ready" : "memory_not_configured",
    expectedTables,
    presentTables,
    missingTables,
    evidenceRetrieval: ok ? "ready" : "evidence_unavailable",
    limitations: ok
      ? []
      : [
          "CutisAI cannot retrieve durable personal memory until all memory and ML lineage tables are present.",
          "Evidence retrieval remains unavailable until a server-side retrieval provider is configured.",
        ],
  };
}
