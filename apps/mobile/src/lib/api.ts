import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const requestTimeoutMs = 12_000;

export type MutationOperation<T> = Readonly<{
  localOperationId: string;
  idempotencyKey: string;
  requestId: string;
  payload: T;
  payloadSchemaVersion: string;
  createdAt: string;
}>;

export function createMutationOperation<T>(
  payload: T,
  payloadSchemaVersion = "1",
): MutationOperation<T> {
  return {
    localOperationId: Crypto.randomUUID(),
    idempotencyKey: Crypto.randomUUID(),
    requestId: Crypto.randomUUID(),
    payload,
    payloadSchemaVersion,
    createdAt: new Date().toISOString(),
  };
}

async function authenticatedRequest(
  path: string,
  init: RequestInit,
  requestId: string,
  idempotencyKey?: string,
): Promise<Response> {
  if (!apiBase) throw new Error("api_not_configured");

  let { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("auth_required");
  let refreshed = false;

  const send = async (): Promise<Response> => {
    const controller = new AbortController();
    const callerSignal = init.signal;
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) abortFromCaller();
    else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = setTimeout(
      () => controller.abort(new Error("request_timeout")),
      requestTimeoutMs,
    );
    try {
      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.body === undefined ? {} : { "content-type": "application/json" }),
          authorization: `Bearer ${data.session?.access_token}`,
          "x-request-id": requestId,
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
          ...init.headers,
        },
        signal: controller.signal,
      });

      if (response.status === 401 && !refreshed) {
        refreshed = true;
        const refreshedSession = await supabase.auth.refreshSession();
        data = refreshedSession.data;
        if (!data.session) throw new Error("auth_required");
        return send();
      }
      return response;
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }
  };

  return send();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => ({ ok: false, error: "non_json_response" }));
  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : `http_${response.status}`;
    throw new Error(error);
  }
  return payload as T;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedRequest(path, init, Crypto.randomUUID());
  return parseResponse<T>(response);
}

export async function apiMutation<TResponse, TPayload>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  operation: MutationOperation<TPayload>,
): Promise<TResponse> {
  const response = await authenticatedRequest(
    path,
    { method, body: JSON.stringify(operation.payload) },
    operation.requestId,
    operation.idempotencyKey,
  );
  return parseResponse<TResponse>(response);
}
