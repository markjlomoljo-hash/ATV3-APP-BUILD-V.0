-- Forward-only hardening for governed ML lineage and generated private artifacts.
-- This migration does not alter credentials, canonical user tables, or existing data.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Model registry lifecycle and immutable artifact evidence.
alter table if exists public.ml_model_versions
  add column if not exists status text,
  add column if not exists artifact_sha256 text,
  add column if not exists dataset_version text,
  add column if not exists label_schema_version text,
  add column if not exists training_run_id uuid,
  add column if not exists code_commit text,
  add column if not exists evaluation_report jsonb not null default '{}'::jsonb,
  add column if not exists calibration_report jsonb not null default '{}'::jsonb,
  add column if not exists fairness_report jsonb not null default '{}'::jsonb,
  add column if not exists minimum_data jsonb not null default '{}'::jsonb,
  add column if not exists latency_size jsonb not null default '{}'::jsonb,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists rollback_model_version_id uuid references public.ml_model_versions(id) on delete set null;

update public.ml_model_versions
set status = case when active then 'active' else 'rejected' end
where status is null;

alter table public.ml_model_versions alter column status set default 'rejected';
alter table public.ml_model_versions alter column status set not null;
alter table public.ml_model_versions drop constraint if exists ml_model_versions_status_check;
alter table public.ml_model_versions add constraint ml_model_versions_status_check
  check (status in ('candidate', 'validated', 'approved', 'active', 'deprecated', 'rejected')) not valid;
alter table public.ml_model_versions validate constraint ml_model_versions_status_check;
alter table public.ml_model_versions drop constraint if exists ml_model_versions_artifact_sha256_check;
alter table public.ml_model_versions add constraint ml_model_versions_artifact_sha256_check
  check (artifact_sha256 is null or artifact_sha256 ~ '^[0-9a-f]{64}$') not valid;
alter table public.ml_model_versions validate constraint ml_model_versions_artifact_sha256_check;

-- Dataset snapshots must carry rights, consent, quality, split, and approval evidence.
alter table if exists public.ml_dataset_versions
  add column if not exists snapshot_uri text,
  add column if not exists snapshot_sha256 text,
  add column if not exists consent_review jsonb not null default '{}'::jsonb,
  add column if not exists deidentification_review jsonb not null default '{}'::jsonb,
  add column if not exists phi_review jsonb not null default '{}'::jsonb,
  add column if not exists population_summary jsonb not null default '{}'::jsonb,
  add column if not exists schema_version text,
  add column if not exists label_schema_version text,
  add column if not exists split_manifest jsonb not null default '{}'::jsonb,
  add column if not exists quality_report jsonb not null default '{}'::jsonb,
  add column if not exists bias_report jsonb not null default '{}'::jsonb,
  add column if not exists allowed_tasks text[] not null default '{}'::text[],
  add column if not exists retention_policy jsonb not null default '{}'::jsonb,
  add column if not exists deletion_policy jsonb not null default '{}'::jsonb,
  add column if not exists approval_state text not null default 'not_approved',
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

alter table public.ml_dataset_versions drop constraint if exists ml_dataset_versions_snapshot_sha256_check;
alter table public.ml_dataset_versions add constraint ml_dataset_versions_snapshot_sha256_check
  check (snapshot_sha256 is null or snapshot_sha256 ~ '^[0-9a-f]{64}$') not valid;
alter table public.ml_dataset_versions validate constraint ml_dataset_versions_snapshot_sha256_check;

-- Training is reproducible metadata, never an implicit read from current operational rows.
alter table if exists public.ml_training_runs
  add column if not exists code_commit text,
  add column if not exists feature_schema_version text,
  add column if not exists label_schema_version text,
  add column if not exists config_version text,
  add column if not exists random_seed bigint,
  add column if not exists algorithm text,
  add column if not exists hyperparameters jsonb not null default '{}'::jsonb,
  add column if not exists environment_manifest jsonb not null default '{}'::jsonb,
  add column if not exists artifact_manifest jsonb not null default '{}'::jsonb,
  add column if not exists evaluation_report_uri text,
  add column if not exists vertex_pipeline_job text,
  add column if not exists experiment_run_id text,
  add column if not exists promotion_state text not null default 'not_requested',
  add column if not exists promoted_by text,
  add column if not exists promoted_at timestamptz;

-- Durable job/result lineage uses the shared request and response vocabulary.
alter table if exists public.ml_analysis_jobs
  add column if not exists request_id uuid,
  add column if not exists idempotency_key text,
  add column if not exists module text,
  add column if not exists task text,
  add column if not exists payload_hash text,
  add column if not exists consent_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists lease_owner text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists deadline_at timestamptz,
  add column if not exists error_class text,
  add column if not exists trace_id text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists dead_lettered_at timestamptz;

alter table public.ml_analysis_jobs drop constraint if exists ml_analysis_jobs_attempts_check;
alter table public.ml_analysis_jobs add constraint ml_analysis_jobs_attempts_check
  check (attempt_count >= 0 and max_attempts between 1 and 20 and attempt_count <= max_attempts) not valid;
alter table public.ml_analysis_jobs validate constraint ml_analysis_jobs_attempts_check;
create unique index if not exists ml_analysis_jobs_user_idempotency_idx
  on public.ml_analysis_jobs(user_id, idempotency_key) where idempotency_key is not null;
create index if not exists ml_analysis_jobs_dispatch_idx
  on public.ml_analysis_jobs(status, next_attempt_at, lease_expires_at);

alter table if exists public.ml_analysis_results
  alter column result drop not null,
  add column if not exists result_type text,
  add column if not exists readiness_state text,
  add column if not exists safety_state text,
  add column if not exists coverage numeric,
  add column if not exists calibration_state text,
  add column if not exists confidence_label text,
  add column if not exists uncertainty jsonb not null default '[]'::jsonb,
  add column if not exists confounders jsonb not null default '[]'::jsonb,
  add column if not exists evidence_state text,
  add column if not exists artifact_sha256 text,
  add column if not exists latency_ms numeric,
  add column if not exists error_class text,
  add column if not exists trace_id text,
  add column if not exists request_id uuid,
  add column if not exists idempotency_key text,
  add column if not exists contract_version text not null default '1.0.0';

alter table public.ml_analysis_results drop constraint if exists ml_analysis_results_coverage_check;
alter table public.ml_analysis_results add constraint ml_analysis_results_coverage_check
  check (coverage is null or (coverage >= 0 and coverage <= 1)) not valid;
alter table public.ml_analysis_results validate constraint ml_analysis_results_coverage_check;
alter table public.ml_analysis_results drop constraint if exists ml_analysis_results_unavailable_confidence_check;
alter table public.ml_analysis_results add constraint ml_analysis_results_unavailable_confidence_check
  check (
    readiness_state is null
    or readiness_state not in ('insufficient_data', 'not_configured', 'unsupported_offline',
      'consent_restricted', 'model_unavailable', 'evidence_unavailable',
      'error_retryable', 'error_terminal')
    or (result is null and confidence is null
      and (confidence_label is null or confidence_label = 'not_applicable'))
  ) not valid;
alter table public.ml_analysis_results validate constraint ml_analysis_results_unavailable_confidence_check;

-- Backend registry, training, audit, and raw feature/intelligence lineage are not client APIs.
drop policy if exists "authenticated model metadata read" on public.ml_model_versions;
drop policy if exists "authenticated dataset metadata read" on public.ml_dataset_versions;
drop policy if exists "owner read" on public.audit_logs;
drop policy if exists "owner read" on public.ml_feature_snapshots;
drop policy if exists "owner read" on public.intelligence_events;

revoke all privileges on table public.ml_model_versions,
  public.ml_dataset_versions,
  public.ml_training_runs,
  public.audit_logs,
  public.ml_feature_snapshots,
  public.intelligence_events
from anon, authenticated;

grant select, insert, update, delete on table public.ml_model_versions,
  public.ml_dataset_versions,
  public.ml_training_runs,
  public.audit_logs,
  public.ml_feature_snapshots,
  public.intelligence_events
to service_role;

-- Ensure all three buckets exist and remain private with bounded content types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('face-scans-raw', 'face-scans-raw', false, 4194304,
    array['image/jpeg', 'image/png', 'image/heic', 'image/heif']),
  ('reports', 'reports', false, 52428800,
    array['application/pdf', 'application/zip', 'application/json', 'text/csv']),
  ('skin-twin', 'skin-twin', false, 10485760,
    array['image/jpeg', 'image/png', 'application/json'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Remove the old shared client-write policies. Reports and Skin Twin outputs are server-generated.
drop policy if exists "own folder insert" on storage.objects;
drop policy if exists "own folder update" on storage.objects;
drop policy if exists "own folder delete" on storage.objects;
drop policy if exists "face scans consented insert" on storage.objects;
drop policy if exists "face scans owner delete" on storage.objects;

create policy "face scans consented insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'face-scans-raw'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.consents
    where user_id = (select auth.uid())
      and raw_image_retention is true
  )
);

create policy "face scans owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'face-scans-raw'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

commit;

-- Rollback guidance (manual, reviewed): restore the prior policy/grant definitions from
-- 20260710233648 and 20260710233922. Added nullable lineage columns intentionally remain;
-- dropping them would destroy governance evidence.
