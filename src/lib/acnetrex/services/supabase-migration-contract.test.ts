import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260710233648_phase7_memory_ml_contracts.sql",
);
const hardeningMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260710233922_supabase_security_performance_hardening.sql",
);
const writeBoundaryMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260711042855_mobile_backend_write_boundary.sql",
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
      "ml_dataset_versions",
      "ml_training_runs",
      "ml_fallback_events",
      "intelligence_events",
      "cutisai_conversations",
      "cutisai_messages",
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("adds missing Phase 7 contracts without duplicating the live canonical tables", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const table of [
      "report_requests",
      "report_files",
      "export_requests",
      "deletion_requests",
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
    }

    for (const duplicate of [
      "users",
      "consent_settings",
      "daily_logs",
      "face_atlas_scans",
      "forecast_summaries",
      "streak_state",
    ]) {
      expect(sql).not.toContain(`create table if not exists public.${duplicate}`);
    }
  });

  it("hardens tenant isolation, anonymous grants, storage, and runtime telemetry", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("alter table public.ml_runtime_events add column if not exists user_id uuid");
    expect(sql).toContain("revoke all privileges on all tables in schema public from anon");
    expect(sql).toContain('drop policy if exists "own folder update" on storage.objects');
    expect(sql).toContain("with check");
    expect(sql).toContain("file_size_limit");
  });
});

describe("Supabase security hardening contract", () => {
  it("removes public security-definer RPC exposure and optimizes legacy RLS", () => {
    const sql = readFileSync(hardeningMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create or replace function private.has_role");
    expect(sql).toContain("revoke all on function public.rls_auto_enable() from public, anon, authenticated");
    expect(sql).toContain("drop function if exists public.has_role");
    expect(sql).toContain("(select auth.uid())");
  });

  it("adds every foreign-key index identified by the live advisor", () => {
    const sql = readFileSync(hardeningMigrationPath, "utf8").toLowerCase();

    for (const index of [
      "idx_annotations_user_id",
      "cutisai_messages_user_id_idx",
      "deletion_audit_events_user_id_idx",
      "deletion_requests_user_id_idx",
      "export_files_user_id_idx",
      "memory_retrieval_logs_conversation_idx",
      "ml_fallback_events_job_idx",
      "ml_training_runs_dataset_idx",
      "ml_training_runs_model_idx",
      "report_consent_snapshots_user_id_idx",
      "report_files_user_id_idx",
      "report_jobs_user_id_idx",
    ]) {
      expect(sql).toContain(`create index if not exists ${index}`);
    }
  });
});

describe("mobile backend write boundary", () => {
  it("prevents authenticated clients from forging database writes", () => {
    const sql = readFileSync(writeBoundaryMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("revoke insert, update, delete on all tables in schema public from authenticated");
    expect(sql).toContain("grant select on all tables in schema public to authenticated");
    expect(sql).toContain("mobile -> fastapi -> supabase");
  });
});
