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
const trainingLineageBoundaryMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260713020013_revoke_ml_training_runs_client_read.sql",
);
const mlGovernanceHardeningMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260714060500_ml_governance_security_hardening.sql",
);
const legacyGrantHardeningMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260714070000_revoke_legacy_anon_and_client_writes.sql",
);
const mlDeliveryReconciliationMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260714143000_ml_delivery_state_reconciliation.sql",
);
const auditRetentionDeletionMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260715053000_preserve_audit_on_user_deletion.sql",
);
const scinGovernanceSchemaMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260716090000_scin_governance_schema.sql",
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

  it("keeps ML training lineage behind the service-role boundary", () => {
    const sql = readFileSync(trainingLineageBoundaryMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain(
      "revoke all privileges on table public.ml_training_runs from anon, authenticated",
    );
    expect(sql).toContain(
      "grant select, insert, update, delete on table public.ml_training_runs to service_role",
    );
  });
});

describe("ML governance and private artifact boundary", () => {
  it("provides server-only durable stores for the production ML service", () => {
    const sql = readFileSync(mlGovernanceHardeningMigrationPath, "utf8").toLowerCase();

    for (const table of ["ml_service_idempotency", "ml_service_jobs"]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain(
      "revoke all on public.ml_service_idempotency, public.ml_service_jobs from anon, authenticated",
    );
    expect(sql).toContain("grant all on public.ml_service_idempotency, public.ml_service_jobs to service_role");
  });

  it("keeps registry, dataset, training, audit, and raw lineage server-only", () => {
    const sql = readFileSync(mlGovernanceHardeningMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("revoke all privileges on table public.ml_model_versions");
    expect(sql).toContain("public.ml_dataset_versions");
    expect(sql).toContain("public.ml_training_runs");
    expect(sql).toContain("public.audit_logs");
    expect(sql).toContain("public.ml_feature_snapshots");
    expect(sql).toContain("public.intelligence_events");
    expect(sql).toContain('drop policy if exists "authenticated model metadata read"');
    expect(sql).toContain('drop policy if exists "authenticated dataset metadata read"');
    expect(sql).toContain('drop policy if exists "owner read" on public.audit_logs');
  });

  it("adds governed model, dataset, training, job, and result lineage", () => {
    const sql = readFileSync(mlGovernanceHardeningMigrationPath, "utf8").toLowerCase();

    for (const column of [
      "status text",
      "artifact_sha256 text",
      "label_schema_version text",
      "code_commit text",
      "snapshot_uri text",
      "split_manifest jsonb",
      "consent_review jsonb",
      "request_id uuid",
      "idempotency_key text",
      "readiness_state text",
      "safety_state text",
      "calibration_state text",
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain("check (status in ('candidate', 'validated', 'approved', 'active', 'deprecated', 'rejected')) not valid");
  });

  it("makes generated report and Skin Twin artifacts read-only to clients", () => {
    const sql = readFileSync(mlGovernanceHardeningMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("insert into storage.buckets");
    expect(sql).toContain("on conflict (id) do update");
    expect(sql).toContain('drop policy if exists "own folder insert" on storage.objects');
    expect(sql).toContain('drop policy if exists "own folder update" on storage.objects');
    expect(sql).toContain('drop policy if exists "own folder delete" on storage.objects');
    expect(sql).toContain("bucket_id = 'face-scans-raw'");
    expect(sql).toContain("raw_image_retention is true");
    expect(sql).not.toContain("for insert to authenticated\nwith check (\n  bucket_id = any (array['reports', 'skin-twin'])");
  });
});

describe("legacy public grant hardening", () => {
  it("removes anonymous table access and direct authenticated writes now and by default", () => {
    const sql = readFileSync(legacyGrantHardeningMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("revoke all privileges on all tables in schema public from anon");
    expect(sql).toContain(
      "revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated",
    );
    expect(sql).toContain(
      "alter default privileges for role postgres in schema public revoke all on tables from anon",
    );
    expect(sql).toContain(
      "alter default privileges for role postgres in schema public revoke insert, update, delete, truncate, references, trigger on tables from authenticated",
    );
    expect(sql).not.toContain("grant all on all tables in schema public to authenticated");
  });

  it("keeps backend lineage undiscoverable and removes duplicate ML read policies", () => {
    const sql = readFileSync(legacyGrantHardeningMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain(
      "revoke select on public.ml_model_versions, public.ml_dataset_versions, public.ml_training_runs",
    );
    expect(sql).toContain('drop policy if exists "owner read" on public.ml_analysis_jobs');
    expect(sql).toContain('drop policy if exists "owner read" on public.ml_analysis_results');
  });
});

describe("ML delivery state reconciliation", () => {
  it("separates processing permissions from learning and raw-image retention with default deny", () => {
    const sql = readFileSync(mlDeliveryReconciliationMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("personal_processing boolean not null default false");
    expect(sql).toContain("raw_image_processing boolean not null default false");
    expect(sql).not.toContain("update public.consents set personal_processing = personal_learning");
    expect(sql).not.toContain("update public.consents set raw_image_processing = raw_image_retention");
  });

  it("pins the worker outbox lifecycle and restores explicit owner-only result reads", () => {
    const sql = readFileSync(mlDeliveryReconciliationMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("'pending', 'leased', 'processed', 'failed_retryable', 'dead_letter'");
    expect(sql).toContain('drop policy if exists "users own ml_analysis_jobs rows"');
    expect(sql).toContain('drop policy if exists "users own ml_analysis_results rows"');
    expect(sql).toContain('create policy "owner read" on public.ml_analysis_jobs for select to authenticated');
    expect(sql).toContain('create policy "owner read" on public.ml_analysis_results for select to authenticated');
    expect(sql).not.toContain("for all to authenticated");
  });
});

describe("audit retention during account deletion", () => {
  it("retains append-only audit rows while removing their auth-user foreign key", () => {
    const sql = readFileSync(auditRetentionDeletionMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("on delete set null");
    expect(sql).toContain("to_jsonb(new) - 'user_id'");
    expect(sql).toContain("to_jsonb(old) - 'user_id'");
    expect(sql).toContain("new.user_id is null");
    expect(sql).toContain("raise exception 'audit_logs_are_append_only'");
    expect(sql).not.toContain("disable trigger");
  });
});

describe("SCIN governance schema", () => {
  it("creates split and consent evidence tables without fabricating approvals", () => {
    const sql = readFileSync(scinGovernanceSchemaMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create table if not exists public.split_manifest");
    expect(sql).toContain("create table if not exists public.consent_review");
    expect(sql).toContain(
      "references public.ml_dataset_versions(dataset_name, dataset_version)",
    );
    expect(sql).toContain("default 'pending'");
    expect(sql).not.toMatch(/insert\s+into/i);
    expect(sql).not.toMatch(/'approved'|'verified'|'passed'/i);
  });

  it("keeps governance evidence service-role only", () => {
    const sql = readFileSync(scinGovernanceSchemaMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("alter table public.split_manifest enable row level security");
    expect(sql).toContain("alter table public.consent_review enable row level security");
    expect(sql).toContain(
      "revoke all on public.split_manifest, public.consent_review from anon, authenticated",
    );
    expect(sql).toContain(
      "grant select, insert, update, delete on public.split_manifest, public.consent_review to service_role",
    );
  });
});
