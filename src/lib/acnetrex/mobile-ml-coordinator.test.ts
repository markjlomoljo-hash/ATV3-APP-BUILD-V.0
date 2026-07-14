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
    const queue = vi.fn();
    const coordinator = createMobileMlCoordinator({ createId: vi.fn()
      .mockReturnValueOnce("operation-1")
      .mockReturnValueOnce("idempotency-1")
      .mockReturnValueOnce("request-1"), queue, submit });

    const result = await coordinator.execute(request, { networkAvailable: true });

    expect(submit).toHaveBeenCalledWith(request, {
      localOperationId: "operation-1",
      idempotencyKey: "idempotency-1",
      requestId: "request-1",
    });
    expect(queue).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: "cloud", jobId: "job-1" });
  });

  it("persists the original cloud payload and identities when offline", async () => {
    const submit = vi.fn();
    const queue = vi.fn().mockResolvedValue(undefined);
    const coordinator = createMobileMlCoordinator({ createId: vi.fn()
      .mockReturnValueOnce("operation-2")
      .mockReturnValueOnce("idempotency-2")
      .mockReturnValueOnce("request-2"), queue, submit });

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
    expect(result).toMatchObject({ mode: "queued_for_cloud", requestId: "request-2" });
  });
});
