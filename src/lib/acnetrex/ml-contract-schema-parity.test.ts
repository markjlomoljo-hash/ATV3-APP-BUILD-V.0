import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  inferenceRequestSchema,
  inferenceResponseSchema,
} from "../../../packages/ml-local-runtime/src/contracts";

const requestSchema = JSON.parse(
  readFileSync(resolve("ml-service/schemas/inference-request.schema.json"), "utf8"),
);
const responseSchema = JSON.parse(
  readFileSync(resolve("ml-service/schemas/inference-response.schema.json"), "utf8"),
);
const uuid = "11111111-1111-4111-8111-111111111111";
const request = {
  contract_version: "1.0.0",
  request_id: uuid,
  idempotency_key: uuid,
  module: "sleepderm",
  task: "sleep_pattern_analysis",
  runtime_preference: "cloud",
  feature_schema_version: "1.0.0",
  input_record_refs: ["sleep_logs:11111111-1111-4111-8111-111111111112"],
  inputs: {},
  context: { timezone: "Asia/Manila", locale: "en-PH" },
  consent: {
    personal_processing: true,
    raw_image_processing: false,
    anonymous_learning: false,
  },
};

describe("v1 Zod/Pydantic/JSON-schema parity", () => {
  it("publishes the same required request surface and bounded reference grammar", () => {
    expect(new Set(requestSchema.required)).toEqual(new Set(Object.keys(request)));
    expect(requestSchema.properties.module).toEqual({
      type: "string",
      minLength: 2,
      maxLength: 64,
      pattern: "^[a-z0-9_-]+$",
    });
    expect(requestSchema.properties.input_record_refs).toEqual({
      type: "array",
      maxItems: 500,
      items: {
        type: "string",
        minLength: 3,
        maxLength: 241,
        pattern: "^[a-z][a-z0-9_]{0,79}:[A-Za-z0-9-]{1,160}$",
      },
    });
    expect(requestSchema.properties.context.required).toEqual(["timezone", "locale"]);

    expect(inferenceRequestSchema.safeParse(request).success).toBe(true);
    expect(inferenceRequestSchema.safeParse({ ...request, context: undefined }).success).toBe(false);
    expect(inferenceRequestSchema.safeParse({ ...request, module: "SLEEP DERM" }).success).toBe(false);
    expect(
      inferenceRequestSchema.safeParse({
        ...request,
        input_record_refs: ["not-an-owner-record-reference"],
      }).success,
    ).toBe(false);
  });

  it("publishes UUID response identities and the literal feature schema version", () => {
    expect(responseSchema.properties.request_id).toEqual({ type: "string", format: "uuid" });
    expect(responseSchema.properties.job_id).toEqual({
      type: ["string", "null"],
      format: "uuid",
    });
    expect(responseSchema.properties.feature_schema_version).toEqual({ const: "1.0.0" });
    expect(responseSchema.required).toContain("job_id");
    expect(responseSchema.properties.module).toEqual({
      type: "string",
      minLength: 2,
      maxLength: 64,
    });
    expect(responseSchema.properties.runtime_provider).toEqual({
      type: "string",
      minLength: 1,
      maxLength: 96,
    });
    expect(responseSchema.properties.features_used.maxItems).toBe(500);
    expect(responseSchema.properties.features_used.items.maxLength).toBe(160);
    expect(responseSchema.properties.limitations.maxItems).toBe(100);
    expect(responseSchema.properties.limitations.minItems).toBeUndefined();

    const unavailable = {
      ok: false,
      request_id: uuid,
      job_id: null,
      module: "sleepderm",
      task: "sleep_pattern_analysis",
      result_type: "model_unavailable",
      result: null,
      runtime_mode: "unavailable",
      runtime_provider: "acnetrex-local-runtime",
      readiness_state: "model_unavailable",
      model_name: null,
      model_version: null,
      training_data_version: null,
      feature_schema_version: "1.0.0",
      input_record_refs: [],
      features_used: [],
      features_missing: [],
      sample_count: 0,
      coverage: 0,
      confidence: null,
      confidence_label: "not_applicable",
      calibration_state: "not_applicable",
      uncertainty: [],
      limitations: [],
      confounders: [],
      evidence_state: "not_applicable",
      safety_state: "model_unavailable",
      sync_status: "not_applicable",
      latency_ms: 0,
      created_at: "2026-07-15T00:00:00.000Z",
    };
    expect(inferenceResponseSchema.safeParse(unavailable).success).toBe(true);
    expect(
      inferenceResponseSchema.safeParse({ ...unavailable, request_id: "not-a-uuid" }).success,
    ).toBe(false);
  });
});
