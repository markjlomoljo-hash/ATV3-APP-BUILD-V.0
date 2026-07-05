import { describe, expect, it } from "vitest";
import {
  classifyCloudRunHealthPayload,
  summarizeDatabaseSchema,
} from "./infrastructure-health";

describe("infrastructure health contracts", () => {
  it("treats the live legacy Supabase schema as useful but not canonical-complete", () => {
    const summary = summarizeDatabaseSchema([
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
    ]);

    expect(summary.legacy.present).toContain("profiles");
    expect(summary.legacy.missing).not.toContain("profiles");
    expect(summary.canonical.missing).toContain("users");
    expect(summary.memory.missing).toContain("user_memory_events");
    expect(summary.status).toBe("schema_mismatch");
    expect(summary.warnings).toContain("canonical_tables_missing");
    expect(summary.warnings).toContain("memory_tables_missing");
  });

  it("marks the canonical schema ready only when app and memory contracts exist", () => {
    const allTables = [
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
    ];

    const summary = summarizeDatabaseSchema(allTables);

    expect(summary.status).toBe("ready");
    expect(summary.canonical.missing).toEqual([]);
    expect(summary.memory.missing).toEqual([]);
  });

  it("does not classify Cloud Run placeholder metadata as healthy ML service readiness", () => {
    expect(classifyCloudRunHealthPayload({ service: "mlatv", project: "project-09bedce3-3c99-4a2b-aad" })).toMatchObject({
      healthy: false,
      reason: "unexpected_health_payload",
    });

    expect(classifyCloudRunHealthPayload({ ok: true, service: "acnetrex-ml", vertexConfigured: true })).toMatchObject({
      healthy: true,
    });
  });
});
