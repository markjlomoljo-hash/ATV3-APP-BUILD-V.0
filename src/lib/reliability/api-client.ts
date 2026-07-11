import { classifyRetry, interactiveMutationPolicy, interactiveReadPolicy, retryWithPolicy } from "./retry-policy";

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  accessToken?: string;
  idempotencyKey?: string;
  requestId?: string;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly retryAfter?: string | null) {
    super(code);
  }
}

export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  const requestId = options.requestId ?? crypto.randomUUID();
  const idempotencyKey = mutating ? options.idempotencyKey ?? crypto.randomUUID() : undefined;

  return retryWithPolicy<T>(
    async (_attempt, signal) => {
      const headers = new Headers(options.headers);
      headers.set("accept", "application/json");
      headers.set("x-request-id", requestId);
      if (options.accessToken) headers.set("authorization", `Bearer ${options.accessToken}`);
      if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
      if (options.body !== undefined) headers.set("content-type", "application/json");

      const response = await fetch(url, {
        ...options,
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const code = payload?.error?.code ?? payload?.error ?? `http_${response.status}`;
        throw new ApiError(response.status, String(code), response.headers.get("retry-after"));
      }
      return payload as T;
    },
    {
      policy: mutating ? interactiveMutationPolicy : interactiveReadPolicy,
      idempotencyKey,
      signal: options.signal,
      shouldRetry: (error) => error instanceof ApiError && classifyRetry(error.status) !== null,
    },
  );
}

