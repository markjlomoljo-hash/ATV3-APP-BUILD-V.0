import {
  scheduleRetry,
  type OfflineOperation,
  type OfflineOperationStore,
} from "./offline-queue-contract.js";

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

export type MobileMlJobStatusResponse = Readonly<{
  ok: true;
  job: Readonly<{
    id: string;
    status: "queued" | "processing" | "completed" | "failed" | "insufficient_data" | "not_configured";
    analysis: Readonly<Record<string, unknown>> | null;
  }> & Record<string, unknown>;
}>;

const terminalJobStatuses = new Set(["completed", "failed", "insufficient_data", "not_configured"]);
const supportedMlEngines = new Set([
  "faceatlas",
  "sleepderm",
  "dermdiet",
  "triggergraph",
  "forecast",
  "skin_twin",
  "cutisai",
]);
const allJobStatuses = new Set(["queued", "processing", ...terminalJobStatuses]);
const terminalSubmitErrors = new Set([
  "auth_required",
  "invalid_analysis_payload",
  "analysis_payload_too_large",
  "idempotency_key_required",
  "idempotency_key_reused_with_different_payload",
]);

function secureRandomRatio(): number {
  if (!globalThis.crypto?.getRandomValues) throw new Error("secure_random_unavailable");
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] / 0x1_0000_0000;
}

function safeErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "network_unavailable";
  return /^[a-z0-9_]{1,80}$/.test(message) ? message : "network_unavailable";
}

function validateJobResponse(value: unknown): MobileMlJobStatusResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("invalid_ml_job_response");
  }
  const response = value as Record<string, unknown>;
  const job = response.job;
  if (response.ok !== true || typeof job !== "object" || job === null || Array.isArray(job)) {
    throw new Error("invalid_ml_job_response");
  }
  const candidate = job as Record<string, unknown>;
  const analysis = candidate.analysis;
  if (typeof candidate.id !== "string"
    || typeof candidate.status !== "string"
    || !allJobStatuses.has(candidate.status)
    || (analysis !== null && (typeof analysis !== "object" || Array.isArray(analysis)))) {
    throw new Error("invalid_ml_job_response");
  }
  return value as MobileMlJobStatusResponse;
}

function createOperation(
  request: MobileMlJobRequest,
  identity: OperationIdentity,
  now: string,
): OfflineOperation<MobileMlJobRequest> {
  return {
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
  };
}

function isMobileMlJobRequest(value: unknown): value is MobileMlJobRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.engine === "string" && supportedMlEngines.has(candidate.engine)
    && typeof candidate.operation === "string"
    && Array.isArray(candidate.inputRecordRefs)
    && typeof candidate.features === "object" && candidate.features !== null && !Array.isArray(candidate.features)
    && typeof candidate.metadata === "object" && candidate.metadata !== null && !Array.isArray(candidate.metadata);
}

export function createMobileMlCoordinator(dependencies: {
  createId: () => string;
  queue: (operation: OfflineOperation<MobileMlJobRequest>) => Promise<void>;
  complete: (localOperationId: string) => Promise<void>;
  submit: (request: MobileMlJobRequest, identity: OperationIdentity) => Promise<CloudJobReference>;
  getJob: (jobId: string) => Promise<MobileMlJobStatusResponse>;
  rememberJob?: (jobId: string, requestId: string) => Promise<void>;
  cacheResult?: (response: MobileMlJobStatusResponse) => Promise<void>;
  forgetJob?: (jobId: string) => Promise<void>;
  now?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
}) {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const sleep = dependencies.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  }));

  return {
    async execute(request: MobileMlJobRequest, environment: { networkAvailable: boolean }) {
      const identity: OperationIdentity = {
        localOperationId: dependencies.createId(),
        idempotencyKey: dependencies.createId(),
        requestId: dependencies.createId(),
      };

      const operation = createOperation(request, identity, now());
      await dependencies.queue(operation);
      if (!environment.networkAvailable) {
        return { mode: "queued_for_cloud" as const, requestId: identity.requestId };
      }

      let reference: CloudJobReference;
      try {
        reference = await dependencies.submit(request, identity);
      } catch (error) {
        const errorCode = safeErrorCode(error);
        if (terminalSubmitErrors.has(errorCode)) {
          await dependencies.queue({
            ...operation,
            attempt_count: 1,
            status: "failed_terminal",
            last_error_code: errorCode,
          });
          throw error;
        }
        await dependencies.queue(scheduleRetry(operation, {
          errorCode,
          now: now(),
          jitterRatio: 1,
          maxAttempts: 5,
        }));
        return { mode: "queued_for_cloud" as const, requestId: identity.requestId, errorCode };
      }

      await dependencies.rememberJob?.(reference.jobId, identity.requestId);
      await dependencies.complete(identity.localOperationId).catch(() => undefined);
      return { mode: "cloud" as const, jobId: reference.jobId, requestId: identity.requestId };
    },

    async waitForResult(jobId: string, options: { maxAttempts?: number; pollIntervalMs?: number } = {}) {
      const maxAttempts = Math.min(Math.max(Math.floor(options.maxAttempts ?? 30), 1), 120);
      const pollIntervalMs = Math.min(Math.max(Math.floor(options.pollIntervalMs ?? 1_000), 1), 10_000);
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = validateJobResponse(await dependencies.getJob(jobId));
        if (response.job.id !== jobId) throw new Error("ml_job_response_lineage_mismatch");
        if (terminalJobStatuses.has(response.job.status)) {
          await dependencies.cacheResult?.(response);
          await dependencies.forgetJob?.(jobId);
          return response;
        }
        if (attempt + 1 < maxAttempts) await sleep(pollIntervalMs);
      }
      throw new Error("ml_job_poll_timeout");
    },
  };
}

export async function replayMobileMlOperations(options: {
  store: OfflineOperationStore;
  submit: (request: MobileMlJobRequest, identity: OperationIdentity) => Promise<CloudJobReference>;
  now?: () => Date;
  random?: () => number;
  limit?: number;
  maxAttempts?: number;
  rememberJob?: (jobId: string, requestId: string) => Promise<void>;
}) {
  const now = options.now ?? (() => new Date());
  const ready = await options.store.listReady(now(), options.limit ?? 10);
  const outcomes: Array<Record<string, unknown>> = [];
  for (const rawOperation of ready) {
    const operation = rawOperation as OfflineOperation<unknown>;
    if (operation.method !== "POST" || operation.route !== "/api/ml/jobs" || !isMobileMlJobRequest(operation.validated_payload)) {
      await options.store.put({
        ...operation,
        attempt_count: operation.attempt_count + 1,
        status: "failed_terminal",
        last_error_code: "invalid_offline_ml_operation",
      });
      outcomes.push({ localOperationId: operation.local_operation_id, status: "failed_terminal", errorCode: "invalid_offline_ml_operation" });
      continue;
    }

    await options.store.put({ ...operation, status: "processing" });
    try {
      const reference = await options.submit(operation.validated_payload, {
        localOperationId: operation.local_operation_id,
        idempotencyKey: operation.idempotency_key,
        requestId: operation.request_id,
      });
      await options.rememberJob?.(reference.jobId, operation.request_id);
      await options.store.remove(operation.local_operation_id);
      outcomes.push({ localOperationId: operation.local_operation_id, status: "completed", jobId: reference.jobId });
    } catch (error) {
      const errorCode = safeErrorCode(error);
      if (terminalSubmitErrors.has(errorCode)) {
        await options.store.put({
          ...operation,
          attempt_count: operation.attempt_count + 1,
          status: "failed_terminal",
          last_error_code: errorCode,
        });
        outcomes.push({ localOperationId: operation.local_operation_id, status: "failed_terminal", errorCode });
        continue;
      }
      const jitterRatio = Math.min(Math.max(options.random?.() ?? secureRandomRatio(), 0), 1);
      const retry = scheduleRetry(operation, {
        errorCode,
        now: now().toISOString(),
        jitterRatio,
        maxAttempts: options.maxAttempts ?? 5,
      });
      await options.store.put(retry);
      outcomes.push({ localOperationId: operation.local_operation_id, status: retry.status, errorCode });
    }
  }
  return outcomes;
}
