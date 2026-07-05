export type ModuleReadiness =
  | "ready"
  | "insufficient_data"
  | "not_configured"
  | "auth_required"
  | "consent_required"
  | "database_unavailable"
  | "ml_unavailable"
  | "cloud_run_unavailable"
  | "vertex_unavailable"
  | "memory_not_configured"
  | "report_worker_not_configured"
  | "native_device_required"
  | "evidence_unavailable"
  | "queued_for_cloud"
  | "error_retry_needed";

export type ConfidenceLabel =
  | "insufficient_data"
  | "early_hypothesis"
  | "moderate_confidence"
  | "high_confidence";

export type RuntimeMode =
  | "cloud_run"
  | "cloud_vertex"
  | "compute_engine"
  | "local_fallback"
  | "queued_for_cloud"
  | "not_configured";

export type SourceRecordRef = {
  table: string;
  id: string;
};

export type ModuleMetadata = {
  moduleId: string;
  generatedAt: string;
  runtimeMode: RuntimeMode;
  modelName?: string;
  modelVersion?: string;
  featureSchemaVersion?: string;
  confidence: ConfidenceLabel;
  inputRecordRefs: SourceRecordRef[];
  featuresUsed: string[];
  featuresMissing: string[];
  limitations: string[];
  syncStatus: "synced" | "queued" | "not_applicable";
};

export type ModuleResult<T> =
  | { ok: true; data: T; metadata: ModuleMetadata }
  | { ok: false; status: ModuleReadiness; error: string; metadata?: ModuleMetadata };

export function unavailableResult(
  moduleId: string,
  status: Exclude<ModuleReadiness, "ready">,
  error: string,
  overrides: Partial<ModuleMetadata> = {},
): ModuleResult<never> {
  return {
    ok: false,
    status,
    error,
    metadata: {
      moduleId,
      generatedAt: new Date(0).toISOString(),
      runtimeMode: status === "queued_for_cloud" ? "queued_for_cloud" : "not_configured",
      confidence: "insufficient_data",
      inputRecordRefs: [],
      featuresUsed: [],
      featuresMissing: [],
      limitations: [error],
      syncStatus: status === "queued_for_cloud" ? "queued" : "not_applicable",
      ...overrides,
    },
  };
}
