import { describe, expect, it } from "vitest";

import {
  cancelOperation,
  createOfflineOperation,
  prepareReplay,
  scheduleRetry,
} from "../src/index";

const createId = (() => {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  ];
  return () => ids.shift() ?? "unexpected";
})();

describe("offline replay reliability", () => {
  it("preserves request and idempotency identities across retries", () => {
    const operation = createOfflineOperation({
      method: "POST",
      route: "/api/ml/jobs",
      validatedPayload: { module: "sleepderm" },
      payloadSchemaVersion: "1.0.0",
      now: "2026-07-13T12:30:00.000Z",
    }, createId);
    const retried = scheduleRetry(operation, {
      errorCode: "network_unavailable",
      now: "2026-07-13T12:31:00.000Z",
      jitterRatio: 0.5,
      maxAttempts: 5,
    });

    expect(retried).toMatchObject({
      local_operation_id: operation.local_operation_id,
      idempotency_key: operation.idempotency_key,
      request_id: operation.request_id,
      attempt_count: 1,
      status: "retry_wait",
      last_error_code: "network_unavailable",
    });
    expect(new Date(retried.next_attempt_at).getTime()).toBeGreaterThan(
      new Date("2026-07-13T12:31:00.000Z").getTime(),
    );
    expect(prepareReplay(retried).headers).toEqual(prepareReplay(operation).headers);
  });

  it("moves exhausted retries to a terminal state without changing identity", () => {
    const operation = createOfflineOperation({
      method: "POST",
      route: "/api/ml/jobs",
      validatedPayload: {},
      payloadSchemaVersion: "1.0.0",
    }, () => "44444444-4444-4444-8444-444444444444");
    const exhausted = scheduleRetry({ ...operation, attempt_count: 2 }, {
      errorCode: "ml_api_timeout",
      now: "2026-07-13T12:31:00.000Z",
      jitterRatio: 0,
      maxAttempts: 3,
    });

    expect(exhausted.status).toBe("failed_terminal");
    expect(exhausted.idempotency_key).toBe(operation.idempotency_key);
  });

  it("supports explicit cancellation on logout without deleting audit-safe state", () => {
    const operation = createOfflineOperation({
      method: "PATCH",
      route: "/api/profile",
      validatedPayload: {},
      payloadSchemaVersion: "1.0.0",
    }, () => "55555555-5555-4555-8555-555555555555");

    expect(cancelOperation(operation, "logout_cancelled")).toMatchObject({
      status: "cancelled",
      last_error_code: "logout_cancelled",
      idempotency_key: operation.idempotency_key,
    });
  });
});
