import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-request-auth", () => ({
  authenticateSupabaseRequest: vi.fn(),
}));

import { POST } from "./route";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

const auth = vi.mocked(authenticateSupabaseRequest);
const fetchMock = vi.fn();

const validBody = {
  engine: "sleepderm",
  operation: "readiness",
  inputRecordRefs: [{ table: "sleep_logs", id: "sleep-1" }],
  features: { sleepDebtMinutes: 120 },
};

function request(body: unknown = validBody, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/ml/predict", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "ml-predict-key-000001",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function upstream(payload: unknown, status = 200, contentType = "application/json") {
  return new Response(contentType === "application/json" ? JSON.stringify(payload) : String(payload), {
    status,
    headers: { "content-type": contentType },
  });
}

describe("POST /api/ml/predict safety and proxy contract", () => {
  beforeEach(() => {
    vi.stubEnv("ML_PROXY_ENABLED", "true");
    vi.stubEnv("ML_PREDICTION_WORKER_ENABLED", "true");
    vi.stubEnv("ACNETREX_ML_API_URL", "https://ml.example.test/");
    vi.stubEnv("ACNETREX_ML_SHARED_SECRET", "server-only-secret");
    auth.mockResolvedValue({ ok: true, userId: "11111111-1111-4111-8111-111111111112" });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not enable the proxy by default", async () => {
    vi.stubEnv("ML_PROXY_ENABLED", "false");
    const response = await POST(new Request("https://example.test", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "ml_proxy_not_enabled" });
  });

  it("requires a durable worker before direct prediction can be enabled", async () => {
    vi.stubEnv("ML_PREDICTION_WORKER_ENABLED", "false");
    const response = await POST(new Request("https://example.test", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "ml_proxy_requires_durable_worker" });
  });

  it("requires a verified user session after both gates are enabled", async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: "auth_required" });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "auth_required" });
  });

  it("requires an idempotency key", async () => {
    const response = await POST(request(validBody, { "idempotency-key": "short" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "idempotency_key_required" });
  });

  it("rejects oversized, malformed, and schema-invalid bodies", async () => {
    const oversized = await POST(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-length": "300000", "idempotency-key": "ml-predict-key-000001" },
      }),
    );
    expect(oversized.status).toBe(413);

    const malformed = await POST(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "ml-predict-key-000001" },
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);

    const invalid = await POST(request({ engine: "unknown" }));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("invalid_prediction_payload");
  });

  it("fails closed when the upstream configuration is incomplete", async () => {
    vi.stubEnv("ACNETREX_ML_API_URL", "");
    expect((await POST(request())).status).toBe(503);
    expect((await POST(request())).status).toBe(503);

    vi.stubEnv("ACNETREX_ML_API_URL", "https://ml.example.test");
    vi.stubEnv("ACNETREX_ML_SHARED_SECRET", "");
    const response = await POST(request());
    expect(await response.json()).toEqual({ ok: false, error: "ml_service_auth_not_configured" });
  });

  it("rejects non-JSON, upstream errors, and unexpected JSON", async () => {
    fetchMock.mockResolvedValueOnce(upstream("provider placeholder", 200, "text/html"));
    expect((await POST(request())).status).toBe(503);

    fetchMock.mockResolvedValueOnce(upstream({ error: "vertex_endpoint_unavailable" }, 400));
    const badRequest = await POST(request());
    expect(badRequest.status).toBe(400);
    expect(await badRequest.json()).toMatchObject({ error: "vertex_endpoint_unavailable" });

    fetchMock.mockResolvedValueOnce(upstream({}, 500));
    const unavailable = await POST(request());
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error).toBe("ml_api_unavailable");

    fetchMock.mockResolvedValueOnce(upstream({ ok: true, service: "metadata-only" }));
    const unexpected = await POST(request());
    expect(unexpected.status).toBe(503);
    expect((await unexpected.json()).error).toBe("ml_api_unexpected_response");
  });

  it("forwards a real prediction payload through the server boundary", async () => {
    fetchMock.mockResolvedValueOnce(upstream({ ok: true, predictions: [{ direction: "observed" }] }));
    const response = await POST(request(validBody, { "x-request-id": "request-id-000001" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ predictions: [{ direction: "observed" }] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ml.example.test/predict",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer server-only-secret",
          "x-request-id": "request-id-000001",
        }),
      }),
    );
  });

  it("accepts the singular prediction shape and classifies network failures", async () => {
    fetchMock.mockResolvedValueOnce(upstream({ prediction: { direction: "observed" } }));
    expect((await POST(request())).status).toBe(200);

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const unreachable = await POST(request());
    expect(unreachable.status).toBe(503);
    expect((await unreachable.json()).error).toBe("ml_api_unreachable");

    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    const timeout = await POST(request());
    expect(timeout.status).toBe(503);
    expect((await timeout.json()).error).toBe("ml_api_timeout");
  });
});
