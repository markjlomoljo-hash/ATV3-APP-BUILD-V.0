import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260705090000_phase7_memory_ml_contracts.sql",
);

describe("Supabase migration contract", () => {
  it("defines persistent memory and ML lineage tables with RLS enabled", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const table of [
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
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("defines canonical Phase 7 persistence tables missing from the live legacy schema", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const table of [
      "users",
      "consent_settings",
      "profile_sections",
      "daily_logs",
      "face_atlas_scans",
      "report_requests",
      "report_files",
      "deletion_requests",
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
    }
  });
});
