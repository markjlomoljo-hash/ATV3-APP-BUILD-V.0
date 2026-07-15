import { describe, expect, it, vi } from "vitest";

import {
  cancelOperation,
  createOfflineOperation,
  prepareReplay,
  scheduleRetry,
} from "../src/index";
import { replayMobileMlOperations } from "../src/mobile-job-coordinator";

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

  it("replays a ready mobile ML operation with its original identities", async () => {
    const operation = createOfflineOperation({
      method: "POST",
      route: "/api/ml/jobs",
      validatedPayload: {
        engine: "sleepderm",
        operation: "sleep_pattern_analysis",
        inputRecordRefs: [],
        features: { records: [] },
        metadata: {},
      },
      payloadSchemaVersion: "1",
      now: "2026-07-14T00:00:00.000Z",
    }, () => "66666666-6666-4666-8666-666666666666");
    const put = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const submit = vi.fn().mockResolvedValue({ jobId: "job-replayed" });
    const rememberJob = vi.fn().mockResolvedValue(undefined);

    const outcomes = await replayMobileMlOperations({
      store: {
        put,
        get: vi.fn(),
        listReady: vi.fn().mockResolvedValue([operation]),
        remove,
      },
      submit,
      rememberJob,
      now: () => new Date("2026-07-14T00:00:01.000Z"),
    });

    expect(submit).toHaveBeenCalledWith(operation.validated_payload, {
      localOperationId: operation.local_operation_id,
      idempotencyKey: operation.idempotency_key,
      requestId: operation.request_id,
    });
    expect(remove).toHaveBeenCalledWith(operation.local_operation_id);
    expect(rememberJob).toHaveBeenCalledWith("job-replayed", operation.request_id);
    expect(rememberJob.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
    expect(outcomes).toEqual([{ localOperationId: operation.local_operation_id, status: "completed", jobId: "job-replayed" }]);
  });

  it("terminalizes an offline operation with an unsupported engine before submission", async () => {
    const operation = createOfflineOperation({
      method: "POST",
      route: "/api/ml/jobs",
      validatedPayload: {
        engine: "untrusted_engine",
        operation: "readiness",
        inputRecordRefs: [],
        features: {},
        metadata: {},
      },
      payloadSchemaVersion: "1",
      now: "2026-07-14T00:00:00.000Z",
    }, () => "77777777-7777-4777-8777-777777777777");
    const put = vi.fn().mockResolvedValue(undefined);
    const submit = vi.fn();

    const outcomes = await replayMobileMlOperations({
      store: {
        put,
        get: vi.fn(),
        listReady: vi.fn().mockResolvedValue([operation]),
        remove: vi.fn(),
      },
      submit,
    });

    expect(submit).not.toHaveBeenCalled();
    expect(outcomes).toEqual([{
      localOperationId: operation.local_operation_id,
      status: "failed_terminal",
      errorCode: "invalid_offline_ml_operation",
    }]);
  });
});
