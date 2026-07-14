import { describe, expect, it } from "vitest";
import {
  classifyCloudRunHealthPayload,
  cloudRunHealthTimeoutMs,
  cloudRunReadinessUrl,
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
    expect(summary.canonical.missing).toContain("report_requests");
    expect(summary.memory.missing).toContain("user_memory_events");
    expect(summary.status).toBe("schema_mismatch");
    expect(summary.warnings).toContain("canonical_tables_missing");
    expect(summary.warnings).toContain("memory_tables_missing");
    expect(summary.warnings).not.toContain("web_compatibility_tables_missing");
  });

  it("marks the canonical schema ready only when app and memory contracts exist", () => {
    const allTables = [
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
    ];

    const summary = summarizeDatabaseSchema(allTables);

    expect(summary.status).toBe("ready");
    expect(summary.canonical.missing).toEqual([]);
    expect(summary.memory.missing).toEqual([]);
    expect(summary.webCompatibility.missing).toEqual([
      "users",
      "consent_settings",
      "consent_audit_events",
      "profile_sections",
      "profile_version_history",
      "daily_logs",
      "face_atlas_scans",
      "treatment_checkins",
    ]);
    expect(summary.warnings).not.toContain("web_compatibility_tables_missing");
  });

  it("does not classify Cloud Run placeholder metadata as healthy ML service readiness", () => {
    expect(classifyCloudRunHealthPayload({ service: "mlatv", project: "project-09bedce3-3c99-4a2b-aad" })).toMatchObject({
      healthy: false,
      reason: "unexpected_health_payload",
    });

    expect(classifyCloudRunHealthPayload({
      ok: true,
      service: "acnetrex-ml",
      artifactIntegrity: { state: "ready" },
      modelRegistryState: "ready",
      persistence: { state: "ready" },
      vertex: { configured: true, state: "verification_required" },
    })).toMatchObject({
      healthy: true,
    });

    expect(classifyCloudRunHealthPayload({
      ok: true,
      service: "acnetrex-ml",
      artifactIntegrity: { state: "ready" },
      modelRegistryState: "ready",
      persistence: { state: "error" },
    })).toMatchObject({
      healthy: false,
      reason: "persistence_not_ready",
    });
  });

  it("targets the canonical Cloud Run readiness endpoint", () => {
    expect(cloudRunReadinessUrl("https://mlatv.example.test/")).toBe(
      "https://mlatv.example.test/health/ready",
    );
  });

  it("uses a bounded production-safe Cloud Run readiness deadline", () => {
    expect(cloudRunHealthTimeoutMs(undefined)).toBe(10_000);
    expect(cloudRunHealthTimeoutMs("250")).toBe(1_000);
    expect(cloudRunHealthTimeoutMs("60000")).toBe(30_000);
    expect(cloudRunHealthTimeoutMs("invalid")).toBe(10_000);
  });
});
