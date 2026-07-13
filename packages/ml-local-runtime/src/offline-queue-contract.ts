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
