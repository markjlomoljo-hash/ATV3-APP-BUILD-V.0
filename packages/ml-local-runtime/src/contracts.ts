import { z } from "zod";

export const CONTRACT_VERSION = "1.0.0" as const;
export const FEATURE_SCHEMA_VERSION = "1.0.0" as const;

export const runtimeModeSchema = z.enum([
  "cloud_run",
  "cloud_vertex",
  "local_model",
  "local_deterministic",
  "queued_for_cloud",
  "unavailable",
]);

export const readinessStateSchema = z.enum([
  "ready",
  "partial",
  "insufficient_data",
  "not_configured",
  "unsupported_offline",
  "consent_restricted",
  "model_unavailable",
  "evidence_unavailable",
  "error_retryable",
  "error_terminal",
]);

export const consentContextSchema = z.object({
  personal_processing: z.boolean(),
  raw_image_processing: z.boolean(),
  anonymous_learning: z.boolean(),
}).strict();

export const inferenceRequestSchema = z.object({
  contract_version: z.literal(CONTRACT_VERSION),
  request_id: z.string().uuid(),
  idempotency_key: z.string().uuid(),
  module: z.string().min(2).max(64).regex(/^[a-z0-9_-]+$/),
  task: z.string().min(2).max(96).regex(/^[a-z0-9_-]+$/),
  runtime_preference: z.enum(["auto", "local", "cloud", "vertex"]),
  feature_schema_version: z.literal(FEATURE_SCHEMA_VERSION),
  input_record_refs: z.array(
    z.string().min(3).max(241).regex(/^[a-z][a-z0-9_]{0,79}:[A-Za-z0-9-]{1,160}$/),
  ).max(500),
  inputs: z.record(z.string(), z.unknown()),
  context: z.object({
    timezone: z.string().min(1).max(64),
    locale: z.string().min(2).max(32),
  }).strict(),
  consent: consentContextSchema,
}).strict();

const confidenceLabelSchema = z.enum(["low", "moderate", "high", "not_applicable"]);

export const inferenceResponseSchema = z.object({
  ok: z.boolean(),
  request_id: z.string().uuid(),
  job_id: z.string().uuid().nullable(),
  module: z.string().min(2).max(64),
  task: z.string().min(2).max(96),
  result_type: z.string().min(1).max(96),
  result: z.record(z.string(), z.unknown()).nullable(),
  runtime_mode: runtimeModeSchema,
  runtime_provider: z.string().min(1).max(96),
  readiness_state: readinessStateSchema,
  model_name: z.string().max(160).nullable(),
  model_version: z.string().max(160).nullable(),
  training_data_version: z.string().max(160).nullable(),
  feature_schema_version: z.string().min(1).max(80),
  input_record_refs: z.array(z.string().max(241)).max(500),
  features_used: z.array(z.string().max(160)).max(500),
  features_missing: z.array(z.string().max(160)).max(500),
  sample_count: z.number().int().min(0),
  coverage: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).nullable(),
  confidence_label: confidenceLabelSchema,
  calibration_state: z.enum(["not_applicable", "unavailable", "uncalibrated", "calibrated"]),
  uncertainty: z.array(z.string().max(500)).max(100),
  limitations: z.array(z.string().max(500)).max(100),
  confounders: z.array(z.string().max(500)).max(100),
  evidence_state: z.enum(["not_applicable", "available", "unavailable"]),
  safety_state: readinessStateSchema,
  sync_status: z.enum(["local_only", "pending_sync", "synced", "not_applicable"]),
  latency_ms: z.number().min(0),
  created_at: z.string().datetime({ offset: true }),
}).strict().superRefine((response, context) => {
  const unavailable = [
    "insufficient_data",
    "not_configured",
    "unsupported_offline",
    "consent_restricted",
    "model_unavailable",
    "evidence_unavailable",
    "error_retryable",
    "error_terminal",
  ].includes(response.readiness_state);
  if (!unavailable) return;
  if (response.result !== null) {
    context.addIssue({ code: "custom", path: ["result"], message: "Unavailable results must not contain substitute output" });
  }
  if (response.confidence !== null || response.confidence_label !== "not_applicable") {
    context.addIssue({ code: "custom", path: ["confidence"], message: "Unavailable results cannot claim confidence" });
  }
});

export type RuntimeMode = z.infer<typeof runtimeModeSchema>;
export type ReadinessState = z.infer<typeof readinessStateSchema>;
export type ConsentContext = z.infer<typeof consentContextSchema>;
export type InferenceRequest = z.infer<typeof inferenceRequestSchema>;
export type InferenceResponse = z.infer<typeof inferenceResponseSchema>;

type UnavailableRequest = Omit<InferenceRequest, "input_record_refs"> & {
  readonly input_record_refs: readonly string[];
};

export function unavailableResponse(
  request: UnavailableRequest,
  state: ReadinessState,
  mode: "queued_for_cloud" | "unavailable",
  limitations: string[],
): InferenceResponse {
  return inferenceResponseSchema.parse({
    ok: false,
    request_id: request.request_id,
    job_id: null,
    module: request.module,
    task: request.task,
    result_type: state,
    result: null,
    runtime_mode: mode,
    runtime_provider: "acnetrex-local-runtime",
    readiness_state: state,
    model_name: null,
    model_version: null,
    training_data_version: null,
    feature_schema_version: request.feature_schema_version,
    input_record_refs: [...request.input_record_refs],
    features_used: [],
    features_missing: [],
    sample_count: 0,
    coverage: 0,
    confidence: null,
    confidence_label: "not_applicable",
    calibration_state: "not_applicable",
    uncertainty: [],
    limitations,
    confounders: [],
    evidence_state: "not_applicable",
    safety_state: state,
    sync_status: mode === "queued_for_cloud" ? "pending_sync" : "not_applicable",
    latency_ms: 0,
    created_at: new Date().toISOString(),
  });
}
