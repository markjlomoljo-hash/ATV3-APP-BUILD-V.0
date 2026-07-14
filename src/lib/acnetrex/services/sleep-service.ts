import type { ModuleResult } from "../module-result";
import { unavailableResult } from "../module-result";

/**
 * Sleep service stub. Handles SleepDerm log writes and reads.
 * Returns database_unavailable until Supabase tables and sessions are configured.
 */

export async function createSleepLog(): Promise<ModuleResult<never>> {
  return unavailableResult("sleepderm", "database_unavailable", "Sleep logs cannot be saved because the database is not configured.");
}

export async function listSleepLogs(): Promise<ModuleResult<never>> {
  return unavailableResult("sleepderm", "database_unavailable", "Sleep logs cannot be loaded because the database is not configured.");
}
