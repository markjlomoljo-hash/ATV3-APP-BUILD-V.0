export type RetryReason = "network" | "timeout" | "rate_limited" | "temporary_upstream";

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  totalDeadlineMs: number;
}

export const interactiveReadPolicy: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  totalDeadlineMs: 15_000,
};

export const interactiveMutationPolicy: RetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 500,
  maxDelayMs: 4_000,
  totalDeadlineMs: 12_000,
};

function secureRandomUnit(): number {
  if (!globalThis.crypto?.getRandomValues) throw new Error("secure_random_unavailable");
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] / 0x1_0000_0000;
}

export function classifyRetry(status: number | undefined, error?: unknown): RetryReason | null {
  if (status === 408) return "timeout";
  if (status === 425 || status === 429) return "rate_limited";
  if (status === 502 || status === 503 || status === 504) return "temporary_upstream";
  if (status !== undefined) return null;
  return error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError")
    ? "network"
    : null;
}

export function retryDelayMs(attempt: number, policy: RetryPolicy, retryAfter?: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, policy.maxDelayMs);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), policy.maxDelayMs);
  }
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.floor(secureRandomUnit() * (ceiling + 1));
}

export async function retryWithPolicy<T>(
  operation: (attempt: number, signal: AbortSignal) => Promise<T>,
  options: {
    policy: RetryPolicy;
    idempotencyKey?: string;
    signal?: AbortSignal;
    shouldRetry?: (error: unknown) => boolean;
    retryAfter?: (error: unknown) => string | null | undefined;
  },
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.policy.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw options.signal.reason;
    const remaining = options.policy.totalDeadlineMs - (Date.now() - startedAt);
    if (remaining <= 0) break;
    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(new DOMException("Timed out", "AbortError")), remaining);
    try {
      return await operation(attempt, controller.signal);
    } catch (error) {
      lastError = error;
      const retryable = options.shouldRetry ? options.shouldRetry(error) : classifyRetry(undefined, error) !== null;
      if (!retryable || attempt >= options.policy.maxAttempts) throw error;
      await new Promise<void>((resolve, reject) => {
        const remainingDelayBudget = Math.max(
          0,
          options.policy.totalDeadlineMs - (Date.now() - startedAt),
        );
        const delay = Math.min(
          retryDelayMs(attempt, options.policy, options.retryAfter?.(error)),
          remainingDelayBudget,
        );
        const cleanup = () => options.signal?.removeEventListener("abort", abort);
        const wait = setTimeout(() => {
          cleanup();
          resolve();
        }, delay);
        const abort = () => {
          clearTimeout(wait);
          cleanup();
          reject(options.signal?.reason ?? new DOMException("Aborted", "AbortError"));
        };
        options.signal?.addEventListener("abort", abort, { once: true });
      });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }
  throw lastError ?? new Error("retry_deadline_exhausted");
}
