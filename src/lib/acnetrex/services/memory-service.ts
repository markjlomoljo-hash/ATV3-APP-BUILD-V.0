import type { ModuleResult } from "../module-result";
import { unavailableResult } from "../module-result";

/**
 * Memory service provides persistence for CutisAI conversations and intelligence events.
 * During Phase 7, Supabase memory tables are not yet configured. All methods
 * return a memory_not_configured state to ensure honest unavailability.
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
