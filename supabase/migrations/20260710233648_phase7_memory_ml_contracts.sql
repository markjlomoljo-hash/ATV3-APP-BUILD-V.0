-- AcneTrex V3 mobile-first Phase 7 persistence, memory, and ML lineage.
--
-- The live Supabase schema already owns the canonical account, consent, log,
-- FaceAtlas, treatment, forecast, Skin Twin, gamification, and report tables.
-- This migration intentionally reuses those tables instead of creating aliases
-- such as users, consent_settings, daily_logs, face_atlas_scans, or
-- forecast_summaries. All user identifiers reference Supabase Auth UUIDs.

create extension if not exists pgcrypto;

create table if not exists public.profile_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  section_key text,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  app_version text,
  schema_version text not null default '1',
  source text not null default 'mobile',
  created_at timestamptz not null default now()
);

create table if not exists public.report_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inclusion_options jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'not_configured')),
  idempotency_key text,
  failure_reason text,
  app_version text,
  schema_version text not null default '1',
  source text not null default 'mobile',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_request_id uuid not null references public.report_requests(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'not_configured')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_request_id uuid not null references public.report_requests(id) on delete cascade,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.report_consent_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_request_id uuid not null references public.report_requests(id) on delete cascade,
  consent_snapshot jsonb not null,
  captured_at timestamptz not null default now()
);

create table if not exists public.export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('json', 'csv', 'zip')),
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'not_configured')),
  idempotency_key text,
  failure_reason text,
  app_version text,
  schema_version text not null default '1',
  source text not null default 'mobile',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.export_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  export_request_id uuid not null references public.export_requests(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('record', 'face_images', 'all_health_data', 'account')),
  target_table text,
  target_id uuid,
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'processing', 'completed', 'cancelled', 'failed')),
  export_requested_first boolean not null default false,
  failure_reason text,
  requested_at timestamptz not null default now(),
  scheduled_purge_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.deletion_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deletion_request_id uuid not null references public.deletion_requests(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cutisai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  consent_scope text not null default 'personal_memory',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.cutisai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.cutisai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_name text,
  tool_payload jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  runtime_mode text,
  model_name text,
  model_version text,
  uncertainty jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_memory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_record_id uuid,
  memory_type text not null,
  content text,
  structured_data jsonb not null default '{}'::jsonb,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  consent_scope text not null default 'personal_memory',
  retention_policy text not null default 'until_revoked',
  app_version text,
  schema_version text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_key text not null,
  fact_value jsonb not null,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  source_event_ids uuid[] not null default '{}'::uuid[],
  consent_scope text not null default 'personal_memory',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary_type text not null,
  content text,
  structured_data jsonb not null default '{}'::jsonb,
  model_name text,
  model_version text,
  input_record_refs jsonb not null default '[]'::jsonb,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  consent_scope text not null default 'personal_memory',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.memory_retrieval_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.cutisai_conversations(id) on delete set null,
  query_hash text not null,
  retrieved_fact_ids uuid[] not null default '{}'::uuid[],
  retrieved_event_ids uuid[] not null default '{}'::uuid[],
  runtime_mode text not null,
  result_count integer not null default 0 check (result_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ml_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  model_version text not null,
  runtime_mode text not null,
  feature_schema_version text,
  training_data_version text,
  artifact_uri text,
  model_card jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (model_name, model_version, runtime_mode)
);

create table if not exists public.ml_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_name text not null,
  dataset_version text not null,
  classification text not null,
  checksum text,
  provenance jsonb not null default '{}'::jsonb,
  license_metadata jsonb not null default '{}'::jsonb,
  synthetic boolean not null default false,
  dataset_card jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (dataset_name, dataset_version)
);

create table if not exists public.ml_training_runs (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid references public.ml_model_versions(id) on delete set null,
  dataset_version_id uuid references public.ml_dataset_versions(id) on delete set null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  parameters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  failure_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  engine text not null,
  operation text not null,
  runtime_mode text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'insufficient_data', 'not_configured')),
  input_record_refs jsonb not null default '[]'::jsonb,
  feature_schema_version text,
  features jsonb not null default '{}'::jsonb,
  features_missing jsonb not null default '[]'::jsonb,
  failure_reason text,
  app_version text,
  schema_version text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ml_analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_id uuid not null references public.ml_analysis_jobs(id) on delete cascade,
  engine text not null,
  operation text not null,
  runtime_mode text not null,
  model_name text,
  model_version text,
  training_data_version text,
  feature_schema_version text,
  input_record_refs jsonb not null default '[]'::jsonb,
  features_used jsonb not null default '[]'::jsonb,
  features_missing jsonb not null default '[]'::jsonb,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  limitations jsonb not null default '[]'::jsonb,
  result jsonb not null,
  sync_status text not null default 'synced',
  telemetry_event_id uuid,
  created_at timestamptz not null default now(),
  unique (job_id)
);

create table if not exists public.ml_feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  feature_schema_version text not null,
  source_record_refs jsonb not null default '[]'::jsonb,
  features jsonb not null,
  missing_features jsonb not null default '[]'::jsonb,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now()
);

create table if not exists public.ml_fallback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  analysis_job_id uuid references public.ml_analysis_jobs(id) on delete set null,
  requested_runtime text not null,
  fallback_runtime text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.intelligence_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  module text not null,
  event_type text not null,
  runtime_mode text not null,
  input_record_refs jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  actor_type text not null default 'user',
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ml_runtime_events add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.ml_runtime_events add column if not exists request_id uuid;
alter table public.ml_runtime_events add column if not exists model_name text;
alter table public.ml_runtime_events add column if not exists model_version text;

create unique index if not exists report_requests_user_idempotency_idx
  on public.report_requests(user_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists export_requests_user_idempotency_idx
  on public.export_requests(user_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists user_memory_facts_current_key_idx
  on public.user_memory_facts(user_id, fact_key) where deleted_at is null;

create index if not exists profile_audit_events_user_created_idx on public.profile_audit_events(user_id, created_at desc);
create index if not exists report_jobs_request_idx on public.report_jobs(report_request_id);
create index if not exists report_files_request_idx on public.report_files(report_request_id);
create index if not exists report_consent_request_idx on public.report_consent_snapshots(report_request_id);
create index if not exists export_files_request_idx on public.export_files(export_request_id);
create index if not exists deletion_audit_request_idx on public.deletion_audit_events(deletion_request_id);
create index if not exists cutisai_conversations_user_created_idx on public.cutisai_conversations(user_id, created_at desc);
create index if not exists cutisai_messages_conversation_created_idx on public.cutisai_messages(conversation_id, created_at);
create index if not exists user_memory_events_user_created_idx on public.user_memory_events(user_id, created_at desc);
create index if not exists user_memory_summaries_user_created_idx on public.user_memory_summaries(user_id, created_at desc);
create index if not exists memory_retrieval_logs_user_created_idx on public.memory_retrieval_logs(user_id, created_at desc);
create index if not exists ml_analysis_jobs_user_created_idx on public.ml_analysis_jobs(user_id, created_at desc);
create index if not exists ml_analysis_results_user_created_idx on public.ml_analysis_results(user_id, created_at desc);
create index if not exists ml_feature_snapshots_user_module_idx on public.ml_feature_snapshots(user_id, module, created_at desc);
create index if not exists ml_fallback_events_user_created_idx on public.ml_fallback_events(user_id, created_at desc);
create index if not exists intelligence_events_user_created_idx on public.intelligence_events(user_id, created_at desc);
create index if not exists audit_logs_user_created_idx on public.audit_logs(user_id, created_at desc);
create index if not exists ml_runtime_events_user_timestamp_idx on public.ml_runtime_events(user_id, "timestamp" desc);

-- Existing foreign-key indexes called out by the Supabase performance advisor.
create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_skin_twin_snapshots_user_id on public.skin_twin_snapshots(user_id);
create index if not exists idx_treatment_plans_user_id on public.treatment_plans(user_id);
create index if not exists idx_treatment_tasks_user_id on public.treatment_tasks(user_id);
create index if not exists idx_trigger_hypotheses_user_id on public.trigger_hypotheses(user_id);
create index if not exists idx_user_badges_badge_id on public.user_badges(badge_id);

alter table public.profile_audit_events enable row level security;
alter table public.report_requests enable row level security;
alter table public.report_jobs enable row level security;
alter table public.report_files enable row level security;
alter table public.report_consent_snapshots enable row level security;
alter table public.export_requests enable row level security;
alter table public.export_files enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.deletion_audit_events enable row level security;
alter table public.cutisai_conversations enable row level security;
alter table public.cutisai_messages enable row level security;
alter table public.user_memory_events enable row level security;
alter table public.user_memory_facts enable row level security;
alter table public.user_memory_summaries enable row level security;
alter table public.memory_retrieval_logs enable row level security;
alter table public.ml_analysis_jobs enable row level security;
alter table public.ml_analysis_results enable row level security;
alter table public.ml_model_versions enable row level security;
alter table public.ml_dataset_versions enable row level security;
alter table public.ml_training_runs enable row level security;
alter table public.ml_feature_snapshots enable row level security;
alter table public.ml_fallback_events enable row level security;
alter table public.intelligence_events enable row level security;
alter table public.audit_logs enable row level security;

-- Owner read access. Derived intelligence and audit rows remain server-written.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profile_audit_events', 'report_jobs', 'report_files',
    'report_consent_snapshots', 'export_files', 'deletion_audit_events',
    'cutisai_messages', 'user_memory_facts', 'user_memory_summaries',
    'memory_retrieval_logs', 'ml_analysis_jobs', 'ml_analysis_results',
    'ml_feature_snapshots', 'ml_fallback_events', 'intelligence_events',
    'audit_logs'
  ] loop
    execute format('drop policy if exists "owner read" on public.%I', table_name);
    execute format(
      'create policy "owner read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );
  end loop;
end $$;

-- User-authored/request rows can be created and maintained only by their owner.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'report_requests', 'export_requests', 'deletion_requests',
    'cutisai_conversations', 'user_memory_events'
  ] loop
    execute format('drop policy if exists "owner rows" on public.%I', table_name);
    execute format(
      'create policy "owner rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name
    );
  end loop;
end $$;

drop policy if exists "owner runtime events" on public.ml_runtime_events;
create policy "owner runtime events"
on public.ml_runtime_events for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "authenticated model metadata read" on public.ml_model_versions;
create policy "authenticated model metadata read"
on public.ml_model_versions for select to authenticated using (true);

drop policy if exists "authenticated dataset metadata read" on public.ml_dataset_versions;
create policy "authenticated dataset metadata read"
on public.ml_dataset_versions for select to authenticated using (true);

drop policy if exists "service role training metadata" on public.ml_training_runs;
create policy "service role training metadata"
on public.ml_training_runs for all to service_role using (true) with check (true);

-- Remove anonymous access and dangerous table-level privileges. RLS remains the
-- tenant boundary for authenticated direct reads; FastAPI uses server credentials.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all tables in schema public from authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Training internals are never exposed to the mobile client.
revoke all privileges on public.ml_training_runs from authenticated;
revoke insert, update, delete on public.ml_model_versions, public.ml_dataset_versions from authenticated;

-- The imported S3 foreign table must not be reachable through PostgREST/GraphQL.
do $$
begin
  if to_regclass('public."S3 wrapper "') is not null then
    execute 'revoke all privileges on table public."S3 wrapper " from anon, authenticated';
  end if;
end $$;

-- Private storage constraints and immutable tenant-folder ownership.
update storage.buckets
set public = false,
    file_size_limit = 4194304,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
where id = 'face-scans-raw';

update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array['application/pdf', 'application/zip', 'application/json', 'text/csv']
where id = 'reports';

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/json']
where id = 'skin-twin';

drop policy if exists "own folder update" on storage.objects;
create policy "own folder update"
on storage.objects for update to authenticated
using (
  bucket_id = any (array['face-scans-raw', 'reports', 'skin-twin'])
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = any (array['face-scans-raw', 'reports', 'skin-twin'])
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
