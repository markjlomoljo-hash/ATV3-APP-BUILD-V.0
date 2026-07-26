/**
 * Network availability helpers.
 *
 * Wraps expo-network so write paths can make honest online/offline decisions
 * and classify failures as connectivity problems (safe to queue and replay)
 * versus real errors (surfaced to the user, never silently swallowed).
 */
import * as Network from "expo-network";

export async function isNetworkAvailable(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    // isInternetReachable can be null while the OS is still probing; only an
    // explicit false is treated as offline so we never queue while online.
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    // If the platform cannot report network state, assume online and let the
    // actual request fail honestly.
    return true;
  }
}

const NETWORK_ERROR_PATTERNS = [
  "network request failed",
  "failed to fetch",
  "fetch failed",
  "network error",
  "request_timeout",
  "timed out",
  "timeout",
  "socket",
  "econnrefused",
  "econnreset",
  "enotfound",
  "internet",
];

/**
 * Heuristic classification of connectivity failures. Supabase-js surfaces
 * fetch-level failures as error objects whose message contains the underlying
 * fetch error text; our service wrappers preserve that text.
 */
export function isNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = message.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}
