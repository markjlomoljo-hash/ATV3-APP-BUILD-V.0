-- AcneTrex V3 Phase 7 + AI memory/ML lineage schema contract.
-- This migration is intentionally additive. Existing legacy tables such as
-- profiles, consents, face_scans, reports, and skin_twin_snapshots are left in
-- place while the Next.js server schema gains reproducible canonical targets.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_settings (
  id text primary key default gen_random_uuid()::text,
  user_id text not null unique,
  anonymous_learning boolean not null default false,
  raw_image_learning boolean not null default false,
  include_faceatlas_photos_in_reports boolean not null default false,
  include_treatment_details_in_reports boolean not null default true,
  marketing_notifications boolean not null default false,
  product_analysis_notifications boolean not null default true,
  report_ready_notifications boolean not null default true,
  streak_risk_notifications boolean not null default true,
  weather_alert_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_audit_events (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  changes jsonb not null,
  source text not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.profile_sections (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  section_key text not null,
  value_json jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'user'
);

create table if not exists public.profile_version_history (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  section_key text not null,
  version integer not null,
  previous_value_json jsonb,
  new_value_json jsonb not null,
  changed_at timestamptz not null default now(),
  actor text not null default 'user',
  reason text,
  include_in_reports boolean not null default true
);

create table if not exists public.profile_audit_events (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  event_type text not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  log_date text not null,
  sleep jsonb,
  food jsonb,
  stress_level integer,
  activity jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.face_atlas_scans (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  scan_date timestamptz not null default now(),
  angles jsonb not null,
  user_lesion_count integer,
  model_lesion_count integer,
  agreement_pct real,
  oiliness_user integer,
  oiliness_model integer,
  confidence text not null default 'insufficient_data',
  image_storage_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.treatment_checkins (
  id text primary key default gen_random_uuid()::text,
  plan_id text not null,
  user_id text not null,
  checkin_date text not null,
  status text not null,
  irritation integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.forecast_summaries (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  window text not null,
  status text not null default 'insufficient_data',
  summary text,
  confidence text,
  created_at timestamptz not null default now()
);

create table if not exists public.report_requests (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  requested_at timestamptz not null default now(),
  inclusion_options jsonb not null,
  status text not null default 'queued',
  idempotency_key text
);

create table if not exists public.report_jobs (
  id text primary key default gen_random_uuid()::text,
  report_request_id text not null,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.report_files (
  id text primary key default gen_random_uuid()::text,
  report_request_id text not null,
  storage_ref text not null,
  mime_type text not null default 'application/pdf',
  size_bytes integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.report_consent_snapshots (
  id text primary key default gen_random_uuid()::text,
  report_request_id text not null,
  consent_json jsonb not null,
  captured_at timestamptz not null default now()
);

create table if not exists public.export_requests (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  format text not null,
  scope text not null,
  status text not null default 'queued',
  requested_at timestamptz not null default now()
);

create table if not exists public.export_files (
  id text primary key default gen_random_uuid()::text,
  export_request_id text not null,
  storage_ref text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.deletion_requests (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  type text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  scheduled_purge_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  export_requested_first boolean not null default false
);

create table if not exists public.deletion_audit_events (
  id text primary key default gen_random_uuid()::text,
  deletion_request_id text not null,
  user_id text not null,
  event_type text not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_memory_events (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  source text not null,
  event_type text not null,
  source_record_refs jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  consent_scope text not null default 'personal_memory',
  created_at timestamptz not null default now()
);

create table if not exists public.user_memory_facts (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  fact_key text not null,
  fact_value jsonb not null,
  confidence text not null default 'insufficient_data',
  source_event_ids jsonb not null default '[]'::jsonb,
  valid_from timestamptz not null default now(),
  valid_until timestamptz
);

create table if not exists public.user_memory_summaries (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  summary_type text not null,
  summary jsonb not null,
  model_name text,
  model_version text,
  input_record_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.memory_retrieval_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  query text not null,
  retrieved_fact_ids jsonb not null default '[]'::jsonb,
  retrieved_event_ids jsonb not null default '[]'::jsonb,
  runtime_mode text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_analysis_jobs (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  engine text not null,
  operation text not null,
  runtime_mode text not null,
  status text not null default 'queued',
  input_record_refs jsonb not null default '[]'::jsonb,
  features jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ml_analysis_results (
  id text primary key default gen_random_uuid()::text,
  job_id text,
  user_id text,
  engine text not null,
  operation text not null,
  runtime_mode text not null,
  model_name text,
  model_version text,
  feature_schema_version text,
  input_record_refs jsonb not null default '[]'::jsonb,
  features_used jsonb not null default '[]'::jsonb,
  features_missing jsonb not null default '[]'::jsonb,
  confidence text not null default 'insufficient_data',
  limitations jsonb not null default '[]'::jsonb,
  result jsonb not null,
  sync_status text not null default 'synced',
  telemetry_event_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_model_versions (
  id text primary key default gen_random_uuid()::text,
  model_name text not null,
  model_version text not null,
  runtime_mode text not null,
  feature_schema_version text,
  artifact_uri text,
  model_card jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_feature_snapshots (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  module text not null,
  feature_schema_version text not null,
  source_record_refs jsonb not null default '[]'::jsonb,
  features jsonb not null,
  missing_features jsonb not null default '[]'::jsonb,
  confidence text not null default 'insufficient_data',
  created_at timestamptz not null default now()
);

create table if not exists public.ml_dataset_versions (
  id text primary key default gen_random_uuid()::text,
  dataset_name text not null,
  dataset_version text not null,
  classification text not null,
  checksum text,
  dataset_card jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.intelligence_events (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  module text not null,
  event_type text not null,
  runtime_mode text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cutisai_conversations (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  title text,
  status text not null default 'active',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_memory_events_user_created_idx on public.user_memory_events(user_id, created_at desc);
create index if not exists user_memory_facts_user_key_idx on public.user_memory_facts(user_id, fact_key);
create index if not exists ml_analysis_results_user_created_idx on public.ml_analysis_results(user_id, created_at desc);
create index if not exists ml_feature_snapshots_user_module_idx on public.ml_feature_snapshots(user_id, module, created_at desc);
create index if not exists cutisai_conversations_user_created_idx on public.cutisai_conversations(user_id, created_at desc);

alter table public.users enable row level security;
alter table public.consent_settings enable row level security;
alter table public.consent_audit_events enable row level security;
alter table public.profile_sections enable row level security;
alter table public.profile_version_history enable row level security;
alter table public.profile_audit_events enable row level security;
alter table public.daily_logs enable row level security;
alter table public.face_atlas_scans enable row level security;
alter table public.treatment_checkins enable row level security;
alter table public.forecast_summaries enable row level security;
alter table public.report_requests enable row level security;
alter table public.report_jobs enable row level security;
alter table public.report_files enable row level security;
alter table public.report_consent_snapshots enable row level security;
alter table public.export_requests enable row level security;
alter table public.export_files enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.deletion_audit_events enable row level security;
alter table public.user_memory_events enable row level security;
alter table public.user_memory_facts enable row level security;
alter table public.user_memory_summaries enable row level security;
alter table public.memory_retrieval_logs enable row level security;
alter table public.ml_analysis_jobs enable row level security;
alter table public.ml_analysis_results enable row level security;
alter table public.ml_model_versions enable row level security;
alter table public.ml_feature_snapshots enable row level security;
alter table public.ml_dataset_versions enable row level security;
alter table public.intelligence_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.cutisai_conversations enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'consent_settings',
    'consent_audit_events',
    'profile_sections',
    'profile_version_history',
    'profile_audit_events',
    'daily_logs',
    'face_atlas_scans',
    'treatment_checkins',
    'forecast_summaries',
    'report_requests',
    'export_requests',
    'deletion_requests',
    'deletion_audit_events',
    'user_memory_events',
    'user_memory_facts',
    'user_memory_summaries',
    'memory_retrieval_logs',
    'ml_analysis_jobs',
    'ml_analysis_results',
    'ml_feature_snapshots',
    'intelligence_events',
    'audit_logs',
    'cutisai_conversations'
  ]
  loop
    execute format('drop policy if exists "Users own %1$s rows" on public.%I', table_name);
    execute format(
      'create policy "Users own %1$s rows" on public.%I for all to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id)',
      table_name,
      table_name
    );
  end loop;
end $$;

drop policy if exists "Users own user profile rows" on public.users;
create policy "Users own user profile rows"
on public.users for all to authenticated
using ((select auth.uid())::text = id)
with check ((select auth.uid())::text = id);

drop policy if exists "Authenticated can read model version metadata" on public.ml_model_versions;
create policy "Authenticated can read model version metadata"
on public.ml_model_versions for select to authenticated
using (true);

drop policy if exists "Authenticated can read dataset version metadata" on public.ml_dataset_versions;
create policy "Authenticated can read dataset version metadata"
on public.ml_dataset_versions for select to authenticated
using (true);
