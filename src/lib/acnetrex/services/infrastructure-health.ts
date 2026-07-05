export const canonicalCriticalTables = [
  "users",
  "consent_settings",
  "profile_sections",
  "profile_version_history",
  "daily_logs",
  "face_atlas_scans",
  "treatment_plans",
  "treatment_checkins",
  "trigger_hypotheses",
  "forecast_summaries",
  "report_requests",
  "report_files",
  "report_jobs",
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

export const persistentMemoryTables = [
  "user_memory_events",
  "user_memory_facts",
  "user_memory_summaries",
  "memory_retrieval_logs",
  "ml_analysis_jobs",
  "ml_analysis_results",
  "ml_model_versions",
  "ml_feature_snapshots",
  "intelligence_events",
  "cutisai_conversations",
] as const;

export type SchemaContractSummary = {
  status: "ready" | "schema_mismatch" | "missing_contracts";
  canonical: { expected: number; present: string[]; missing: string[] };
  legacy: { expected: number; present: string[]; missing: string[] };
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
  const memory = summarizeContract(persistentMemoryTables, presentTables);

  const warnings = [
    ...(canonical.missing.length > 0 ? ["canonical_tables_missing"] : []),
    ...(legacy.missing.length > 0 ? ["legacy_operational_tables_missing"] : []),
    ...(memory.missing.length > 0 ? ["memory_tables_missing"] : []),
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
    memory,
    warnings,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function classifyCloudRunHealthPayload(payload: unknown):
  | { healthy: true; reason: "ok" }
  | { healthy: false; reason: "missing_payload" | "unexpected_health_payload" } {
  if (!isObject(payload)) {
    return { healthy: false, reason: "missing_payload" };
  }

  if (payload.ok === true && payload.service === "acnetrex-ml") {
    return { healthy: true, reason: "ok" };
  }

  return { healthy: false, reason: "unexpected_health_payload" };
}
