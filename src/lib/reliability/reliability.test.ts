import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalJson, decideIdempotency, requestHash } from "./idempotency";
import { classifyRetry, retryWithPolicy } from "./retry-policy";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";
import { apiRequest } from "./api-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("idempotency contract", () => {
  it("hashes equivalent objects identically", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(requestHash({ b: 2, a: 1 })).toBe(requestHash({ a: 1, b: 2 }));
  });

  it("hashes an absent body deterministically", () => {
    expect(canonicalJson(undefined)).toBe("null");
    expect(requestHash(undefined)).toBe(requestHash(null));
  });

  it("replays completed requests and rejects payload conflicts", () => {
    const stored = { requestHash: "same", status: "completed" as const, responseStatus: 201, responseReference: { id: "one" } };
    expect(decideIdempotency(stored, "same", false)).toEqual({ kind: "replay", status: 201, reference: { id: "one" } });
    expect(decideIdempotency(stored, "different", false)).toEqual({ kind: "conflict" });
  });
});

describe("API response contract", () => {
  it("rejects a successful non-JSON response instead of casting it", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetcher = vi.fn().mockResolvedValue(
      new Response("upstream placeholder", { status: 200, headers: { "content-type": "text/plain" } }),
    );
    vi.stubGlobal("fetch", fetcher);

    await expect(apiRequest("https://example.test/health")).rejects.toThrow("non_json_response");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("reuses one idempotency key across a retry", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "temporary" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetcher);

    await expect(
      apiRequest("https://example.test/mutation", {
        method: "POST",
        body: { value: 1 },
        idempotencyKey: "stable-operation-key",
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetcher).toHaveBeenCalledTimes(2);
    const firstHeaders = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    const secondHeaders = new Headers(fetcher.mock.calls[1]?.[1]?.headers);
    expect(firstHeaders.get("idempotency-key")).toBe("stable-operation-key");
    expect(secondHeaders.get("idempotency-key")).toBe("stable-operation-key");
  });

  it("retries a temporary network failure within the read budget", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network reset"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetcher);

    await expect(apiRequest("https://example.test/read")).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("retry policy", () => {
  it("does not classify permanent client errors as retryable", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) expect(classifyRetry(status)).toBeNull();
    expect(classifyRetry(429)).toBe("rate_limited");
    expect(classifyRetry(503)).toBe("temporary_upstream");
  });

  it("enforces the attempt budget", async () => {
    const operation = vi.fn().mockRejectedValue(new TypeError("network"));
    await expect(retryWithPolicy(operation, { policy: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, totalDeadlineMs: 100 } })).rejects.toThrow("network");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe("circuit breaker", () => {
  it("opens after the configured threshold", async () => {
    const breaker = new CircuitBreaker(1, 60_000);
    await expect(breaker.execute(async () => { throw new Error("down"); })).rejects.toThrow("down");
    await expect(breaker.execute(async () => "never")).rejects.toBeInstanceOf(CircuitOpenError);
  });
});
