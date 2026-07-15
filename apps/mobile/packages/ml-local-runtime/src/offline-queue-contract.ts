export interface OfflineOperation<TPayload = unknown> {
  local_operation_id: string;
  idempotency_key: string;
  request_id: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  route: string;
  validated_payload: TPayload;
  payload_schema_version: string;
  created_at: string;
  attempt_count: number;
  next_attempt_at: string;
  status: "pending" | "processing" | "retry_wait" | "completed" | "failed_terminal" | "cancelled";
  last_error_code: string | null;
  dependencies: string[];
}

export interface OfflineOperationStore {
  put(operation: OfflineOperation): Promise<void>;
  get(id: string): Promise<OfflineOperation | null>;
  listReady(now: Date, limit: number): Promise<OfflineOperation[]>;
  remove(id: string): Promise<void>;
}

type OfflineOperationInput<TPayload> = {
  method: OfflineOperation["method"];
  route: string;
  validatedPayload: TPayload;
  payloadSchemaVersion: string;
  dependencies?: string[];
  now?: string;
};

export function createOfflineOperation<TPayload>(
  input: OfflineOperationInput<TPayload>,
  createId: () => string,
): OfflineOperation<TPayload> {
  if (!input.route.startsWith("/")) throw new Error("offline_route_must_be_absolute");
  const now = input.now ?? new Date().toISOString();
  return {
    local_operation_id: createId(),
    idempotency_key: createId(),
    request_id: createId(),
    method: input.method,
    route: input.route,
    validated_payload: input.validatedPayload,
    payload_schema_version: input.payloadSchemaVersion,
    created_at: now,
    attempt_count: 0,
    next_attempt_at: now,
    status: "pending",
    last_error_code: null,
    dependencies: input.dependencies ?? [],
  };
}

export function prepareReplay(operation: OfflineOperation): { headers: Record<string, string>; body: unknown } {
  return {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": operation.idempotency_key,
      "X-Request-ID": operation.request_id,
    },
    body: operation.validated_payload,
  };
}

export function scheduleRetry<TPayload>(
  operation: OfflineOperation<TPayload>,
  options: {
    errorCode: string;
    now: string;
    jitterRatio: number;
    maxAttempts: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  },
): OfflineOperation<TPayload> {
  if (operation.status === "completed" || operation.status === "cancelled") {
    throw new Error("offline_operation_not_retryable");
  }
  if (!Number.isFinite(options.jitterRatio) || options.jitterRatio < 0 || options.jitterRatio > 1) {
    throw new Error("invalid_retry_jitter_ratio");
  }
  const attemptCount = operation.attempt_count + 1;
  const terminal = attemptCount >= options.maxAttempts;
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 60_000;
  const retryCeiling = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attemptCount - 1));
  const nextAttempt = new Date(new Date(options.now).getTime() + Math.round(retryCeiling * options.jitterRatio));

  return {
    ...operation,
    attempt_count: attemptCount,
    next_attempt_at: terminal ? options.now : nextAttempt.toISOString(),
    status: terminal ? "failed_terminal" : "retry_wait",
    last_error_code: options.errorCode,
  };
}

export function cancelOperation<TPayload>(
  operation: OfflineOperation<TPayload>,
  reason: string,
): OfflineOperation<TPayload> {
  if (operation.status === "completed") throw new Error("completed_operation_cannot_be_cancelled");
  return { ...operation, status: "cancelled", last_error_code: reason };
}
