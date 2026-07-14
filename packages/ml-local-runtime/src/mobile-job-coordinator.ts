import type { OfflineOperation } from "./offline-queue-contract.js";

export type MobileMlJobRequest = Readonly<{
  engine: "faceatlas" | "sleepderm" | "dermdiet" | "triggergraph" | "forecast" | "skin_twin" | "cutisai";
  operation: string;
  inputRecordRefs: ReadonlyArray<{ table: string; id: string }>;
  features: Readonly<Record<string, unknown>>;
  metadata: Readonly<Record<string, unknown>>;
}>;

type OperationIdentity = Readonly<{
  localOperationId: string;
  idempotencyKey: string;
  requestId: string;
}>;

type CloudJobReference = Readonly<{ jobId: string }> & Record<string, unknown>;

export function createMobileMlCoordinator(dependencies: {
  createId: () => string;
  queue: (operation: OfflineOperation<MobileMlJobRequest>) => Promise<void>;
  submit: (request: MobileMlJobRequest, identity: OperationIdentity) => Promise<CloudJobReference>;
}) {
  return {
    async execute(request: MobileMlJobRequest, environment: { networkAvailable: boolean }) {
      const identity: OperationIdentity = {
        localOperationId: dependencies.createId(),
        idempotencyKey: dependencies.createId(),
        requestId: dependencies.createId(),
      };

      if (environment.networkAvailable) {
        const reference = await dependencies.submit(request, identity);
        return { mode: "cloud" as const, jobId: reference.jobId, requestId: identity.requestId };
      }

      const now = new Date().toISOString();
      await dependencies.queue({
        local_operation_id: identity.localOperationId,
        idempotency_key: identity.idempotencyKey,
        request_id: identity.requestId,
        method: "POST",
        route: "/api/ml/jobs",
        validated_payload: request,
        payload_schema_version: "1",
        created_at: now,
        attempt_count: 0,
        next_attempt_at: now,
        status: "pending",
        last_error_code: null,
        dependencies: [],
      });
      return { mode: "queued_for_cloud" as const, requestId: identity.requestId };
    },
  };
}
