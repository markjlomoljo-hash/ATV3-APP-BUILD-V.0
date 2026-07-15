import { describe, expect, it, vi } from "vitest";

import {
  createMobileMlCoordinator,
  type MobileMlJobRequest,
} from "../../../packages/ml-local-runtime/src/mobile-job-coordinator";

const request: MobileMlJobRequest = {
  engine: "sleepderm",
  operation: "sleep_pattern_analysis",
  inputRecordRefs: [],
  features: { nights: 7 },
  metadata: { featureSchemaVersion: "1.0.0", appVersion: "0.1.0" },
};

describe("mobile ML coordinator", () => {
  it("submits authenticated cloud work with stable request and idempotency identities", async () => {
    const submit = vi.fn().mockResolvedValue({ ok: true, jobId: "job-1", status: "queued_for_cloud" });
    const queue = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn().mockResolvedValue(undefined);
    const rememberJob = vi.fn().mockResolvedValue(undefined);
    const coordinator = createMobileMlCoordinator({ createId: vi.fn()
      .mockReturnValueOnce("operation-1")
      .mockReturnValueOnce("idempotency-1")
      .mockReturnValueOnce("request-1"), queue, complete, rememberJob, submit, getJob: vi.fn() });

    const result = await coordinator.execute(request, { networkAvailable: true });

    expect(submit).toHaveBeenCalledWith(request, {
      localOperationId: "operation-1",
      idempotencyKey: "idempotency-1",
      requestId: "request-1",
    });
    expect(queue).toHaveBeenCalledWith(expect.objectContaining({
      local_operation_id: "operation-1",
      status: "pending",
    }));
    expect(queue.mock.invocationCallOrder[0]).toBeLessThan(submit.mock.invocationCallOrder[0]);
    expect(rememberJob).toHaveBeenCalledWith("job-1", "request-1");
    expect(rememberJob.mock.invocationCallOrder[0]).toBeLessThan(complete.mock.invocationCallOrder[0]);
    expect(complete).toHaveBeenCalledWith("operation-1");
    expect(result).toMatchObject({ mode: "cloud", jobId: "job-1" });
  });

  it("persists the original cloud payload and identities when offline", async () => {
    const submit = vi.fn();
    const queue = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn();
    const coordinator = createMobileMlCoordinator({ createId: vi.fn()
      .mockReturnValueOnce("operation-2")
      .mockReturnValueOnce("idempotency-2")
      .mockReturnValueOnce("request-2"), queue, complete, submit, getJob: vi.fn() });

    const result = await coordinator.execute(request, { networkAvailable: false });

    expect(queue).toHaveBeenCalledWith(expect.objectContaining({
      local_operation_id: "operation-2",
      idempotency_key: "idempotency-2",
      request_id: "request-2",
      route: "/api/ml/jobs",
      validated_payload: request,
      status: "pending",
    }));
    expect(submit).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: "queued_for_cloud", requestId: "request-2" });
  });

  it("keeps a retryable online failure durable for replay", async () => {
    const submit = vi.fn().mockRejectedValue(new Error("database_unavailable"));
    const queue = vi.fn().mockResolvedValue(undefined);
    const coordinator = createMobileMlCoordinator({
      createId: vi.fn()
        .mockReturnValueOnce("operation-3")
        .mockReturnValueOnce("idempotency-3")
        .mockReturnValueOnce("request-3"),
      queue,
      complete: vi.fn(),
      submit,
      getJob: vi.fn(),
      now: () => "2026-07-14T00:00:00.000Z",
    });

    const result = await coordinator.execute(request, { networkAvailable: true });

    expect(result).toMatchObject({ mode: "queued_for_cloud", errorCode: "database_unavailable" });
    expect(queue).toHaveBeenLastCalledWith(expect.objectContaining({
      local_operation_id: "operation-3",
      attempt_count: 1,
      status: "retry_wait",
      last_error_code: "database_unavailable",
    }));
  });

  it("polls until the owner-scoped durable result is terminal", async () => {
    const getJob = vi.fn()
      .mockResolvedValueOnce({ ok: true, job: { id: "job-4", status: "processing", analysis: null } })
      .mockResolvedValueOnce({
        ok: true,
        job: {
          id: "job-4",
          status: "completed",
          analysis: { readinessState: "ready", resultType: "deterministic_analysis", output: { state: "ready" } },
        },
      });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const cacheResult = vi.fn().mockResolvedValue(undefined);
    const forgetJob = vi.fn().mockResolvedValue(undefined);
    const coordinator = createMobileMlCoordinator({
      createId: vi.fn(),
      queue: vi.fn(),
      complete: vi.fn(),
      submit: vi.fn(),
      getJob,
      sleep,
      cacheResult,
      forgetJob,
    });

    const result = await coordinator.waitForResult("job-4", { maxAttempts: 3, pollIntervalMs: 10 });

    expect(result.job.analysis).toMatchObject({ readinessState: "ready", output: { state: "ready" } });
    expect(getJob).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(cacheResult).toHaveBeenCalledWith(result);
    expect(forgetJob).toHaveBeenCalledWith("job-4");
    expect(cacheResult.mock.invocationCallOrder[0]).toBeLessThan(forgetJob.mock.invocationCallOrder[0]);
  });

  it("rejects a malformed or mismatched owner-scoped polling response", async () => {
    const coordinator = createMobileMlCoordinator({
      createId: vi.fn(),
      queue: vi.fn(),
      complete: vi.fn(),
      submit: vi.fn(),
      getJob: vi.fn().mockResolvedValue({ ok: true, job: { id: "different-job", status: "completed", analysis: null } }),
    });

    await expect(coordinator.waitForResult("job-expected", { maxAttempts: 1 })).rejects.toThrow(
      "ml_job_response_lineage_mismatch",
    );
  });
});
