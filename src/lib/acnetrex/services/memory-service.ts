import type { ModuleResult } from "../module-result";
import { unavailableResult } from "../module-result";

/**
 * Generic fact/summary mutation is intentionally still unavailable until its
 * extraction and retrieval contracts are implemented. CutisAI conversation
 * persistence is exposed separately through the authenticated conversation API.
 */

export async function writeMemoryEvent(): Promise<ModuleResult<never>> {
  return unavailableResult("memory", "memory_not_configured", "Persistent memory tables are not configured.");
}

export async function listMemoryFacts(): Promise<ModuleResult<never>> {
  return unavailableResult("memory", "memory_not_configured", "Persistent memory tables are not configured.");
}

export async function getMemorySummary(): Promise<ModuleResult<never>> {
  return unavailableResult("memory", "memory_not_configured", "Persistent memory tables are not configured.");
}
