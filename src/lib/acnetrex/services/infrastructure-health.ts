export const canonicalCriticalTables = [
  "profiles",
  "consents",
  "sleep_logs",
  "food_logs",
  "face_scans",
  "annotations",
  "treatment_plans",
  "treatment_tasks",
  "trigger_hypotheses",
  "forecasts",
  "skin_twin_snapshots",
  "report_requests",
  "report_files",
  "report_jobs",
  "export_requests",
  "export_files",
  "deletion_requests",
  "ml_runtime_events",
] as const;

export const legacyOperationalTables = [
  "profiles",
  "consents",
  "sleep_logs",
  "food_logs",
  "face_scans",
  "reports",
  "skin_twin_snapshots",
  "treatment_plans",
  "treatment_tasks",
  "trigger_hypotheses",
  "ml_runtime_events",
] as const;

// Transitional Next.js APIs still use this Drizzle contract. These tables are
// not the mobile Supabase source of truth and must never be silently treated as
// aliases for the UUID/RLS-backed canonical tables.
export const webCompatibilityTables = [
  "users",
  "consent_settings",
  "consent_audit_events",
  "profile_sections",
  "profile_version_history",
  "daily_logs",
  "face_atlas_scans",
  "treatment_checkins",
] as const;

export const persistentMemoryTables = [
  "user_memory_events",
  "user_memory_facts",
  "user_memory_summaries",
  "memory_retrieval_logs",
  "ml_analysis_jobs",
  "ml_analysis_results",
  "ml_model_versions",
  "ml_feature_snapshots",
  "ml_dataset_versions",
  "ml_training_runs",
  "ml_fallback_events",
  "intelligence_events",
  "cutisai_conversations",
  "cutisai_messages",
] as const;

export type SchemaContractSummary = {
  status: "ready" | "schema_mismatch" | "missing_contracts";
  canonical: { expected: number; present: string[]; missing: string[] };
  legacy: { expected: number; present: string[]; missing: string[] };
  webCompatibility: { expected: number; present: string[]; missing: string[] };
  memory: { expected: number; present: string[]; missing: string[] };
  warnings: string[];
};

function summarizeContract(expected: readonly string[], presentTables: Set<string>) {
  const present = expected.filter((table) => presentTables.has(table));
  const missing = expected.filter((table) => !presentTables.has(table));

  return {
    expected: expected.length,
    present,
    missing,
  };
}

export function summarizeDatabaseSchema(tableNames: Iterable<string>): SchemaContractSummary {
  const presentTables = new Set(Array.from(tableNames));
  const canonical = summarizeContract(canonicalCriticalTables, presentTables);
  const legacy = summarizeContract(legacyOperationalTables, presentTables);
  const webCompatibility = summarizeContract(webCompatibilityTables, presentTables);
  const memory = summarizeContract(persistentMemoryTables, presentTables);

  const warnings = [
    ...(canonical.missing.length > 0 ? ["canonical_tables_missing"] : []),
    ...(legacy.missing.length > 0 ? ["legacy_operational_tables_missing"] : []),
    ...(memory.missing.length > 0 ? ["memory_tables_missing"] : []),
    ...(webCompatibility.missing.length > 0 ? ["web_compatibility_tables_missing"] : []),
  ];

  const status =
    canonical.missing.length === 0 && memory.missing.length === 0
      ? "ready"
      : legacy.present.length > 0 || canonical.present.length > 0
        ? "schema_mismatch"
        : "missing_contracts";

  return {
    status,
    canonical,
    legacy,
    webCompatibility,
    memory,
    warnings,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function classifyCloudRunHealthPayload(payload: unknown):
  | { healthy: true; reason: "ok" }
  | { healthy: false; reason: "missing_payload" | "unexpected_health_payload" | "service_auth_not_configured" } {
  if (!isObject(payload)) {
    return { healthy: false, reason: "missing_payload" };
  }

  if (payload.ok === true && payload.service === "acnetrex-ml" && payload.serviceAuthConfigured !== true) {
    return { healthy: false, reason: "service_auth_not_configured" };
  }

  if (payload.ok === true && payload.service === "acnetrex-ml" && payload.vertexConfigured === true) {
    return { healthy: true, reason: "ok" };
  }

  return { healthy: false, reason: "unexpected_health_payload" };
}
