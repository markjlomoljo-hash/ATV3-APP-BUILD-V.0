import { describe, expect, it } from "vitest";

import {
  createOfflineOperation,
  inferenceRequestSchema,
  inferenceResponseSchema,
  selectRuntime,
  unavailableResponse,
} from "../../../packages/ml-local-runtime/src/index";

const validRequest = {
  contract_version: "1.0.0",
  request_id: "2b0fb6c0-fc49-4ff3-af12-8f8bc3db9e89",
  idempotency_key: "2a3103fc-aa55-45a4-905a-77747ca08f1f",
  module: "sleepderm",
  task: "sleep_pattern_analysis",
  runtime_preference: "auto",
  feature_schema_version: "1.0.0",
  input_record_refs: ["sleep_logs:11111111-1111-4111-8111-111111111111"],
  inputs: { logs: [] },
  context: { timezone: "Asia/Manila", locale: "en-PH" },
  consent: {
    personal_processing: true,
    raw_image_processing: false,
    anonymous_learning: false,
  },
} as const;

describe("ML local runtime integration contract", () => {
  it("strictly validates the shared v1 request and rejects client-owned identity", () => {
    expect(inferenceRequestSchema.parse(validRequest)).toEqual(validRequest);
    expect(
      inferenceRequestSchema.safeParse({ ...validRequest, user_id: "client-supplied-owner" }).success,
    ).toBe(false);
    expect(inferenceRequestSchema.safeParse({ ...validRequest, consent: undefined }).success).toBe(false);
  });

  it("returns a complete zero-fabrication unavailable response", () => {
    const response = unavailableResponse(
      validRequest,
      "model_unavailable",
      "unavailable",
      ["No approved model artifact is registered."],
    );

    expect(inferenceResponseSchema.parse(response)).toMatchObject({
      ok: false,
      result: null,
      runtime_mode: "unavailable",
      readiness_state: "model_unavailable",
      safety_state: "model_unavailable",
      confidence: null,
      calibration_state: "not_applicable",
    });
  });

  it("rejects substitute numeric output for an unavailable readiness state", () => {
    const invalid = {
      ...unavailableResponse(validRequest, "insufficient_data", "unavailable", ["More records are required."]),
      result: { risk: 0.73 },
      confidence: 0.9,
    };

    expect(inferenceResponseSchema.safeParse(invalid).success).toBe(false);
  });

  it("creates replayable operations without importing a Node-only crypto runtime", () => {
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];
    const operation = createOfflineOperation(
      {
        method: "POST",
        route: "/api/ml/jobs",
        validatedPayload: validRequest,
        payloadSchemaVersion: "1.0.0",
        now: "2026-07-13T12:30:00.000Z",
      },
      () => ids.shift() ?? "unexpected",
    );

    expect(operation).toMatchObject({
      local_operation_id: "11111111-1111-4111-8111-111111111111",
      idempotency_key: "22222222-2222-4222-8222-222222222222",
      request_id: "33333333-3333-4333-8333-333333333333",
      created_at: "2026-07-13T12:30:00.000Z",
      next_attempt_at: "2026-07-13T12:30:00.000Z",
      status: "pending",
    });
  });

  it("refuses processing before considering any runtime when consent is absent", () => {
    expect(
      selectRuntime({
        task: "faceatlas.lesion_detection",
        consent: { ...validRequest.consent, personal_processing: false },
        networkAvailable: true,
        deterministicSupported: false,
        localModelApproved: true,
        localModelCompatible: true,
        cloudHealthy: true,
        vertexRequired: true,
        privacyMode: "cloud_allowed",
      }),
    ).toEqual({ mode: "unavailable", reason: "consent_restricted" });
  });
});
