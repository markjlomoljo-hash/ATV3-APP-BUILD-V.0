import { describe, expect, it, vi } from "vitest";
import { canonicalJson, decideIdempotency, requestHash } from "./idempotency";
import { classifyRetry, retryWithPolicy } from "./retry-policy";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";

describe("idempotency contract", () => {
  it("hashes equivalent objects identically", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(requestHash({ b: 2, a: 1 })).toBe(requestHash({ a: 1, b: 2 }));
  });

  it("replays completed requests and rejects payload conflicts", () => {
    const stored = { requestHash: "same", status: "completed" as const, responseStatus: 201, responseReference: { id: "one" } };
    expect(decideIdempotency(stored, "same", false)).toEqual({ kind: "replay", status: 201, reference: { id: "one" } });
    expect(decideIdempotency(stored, "different", false)).toEqual({ kind: "conflict" });
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

