-- Persist SleepDerm's deterministic, record-derived analytics with provenance.
-- These values are observational calculations, not ML predictions or diagnoses.

alter table public.sleep_logs
  add column if not exists analytics_snapshot jsonb,
  add column if not exists analytics_rule_version text,
  add column if not exists analytics_source text,
  add column if not exists analytics_computed_at timestamptz;

alter table public.sleep_logs drop constraint if exists sleep_logs_analytics_source_check;
alter table public.sleep_logs add constraint sleep_logs_analytics_source_check check (
  analytics_source is null or analytics_source in ('client_deterministic', 'server_deterministic')
);

alter table public.sleep_logs drop constraint if exists sleep_logs_analytics_provenance_check;
alter table public.sleep_logs add constraint sleep_logs_analytics_provenance_check check (
  (analytics_snapshot is null and analytics_rule_version is null and analytics_source is null and analytics_computed_at is null)
  or
  (analytics_snapshot is not null and analytics_rule_version is not null and analytics_source is not null and analytics_computed_at is not null)
);

alter table public.sleep_logs validate constraint sleep_logs_analytics_source_check;
alter table public.sleep_logs validate constraint sleep_logs_analytics_provenance_check;

create index if not exists sleep_logs_user_analytics_computed_idx
  on public.sleep_logs(user_id, analytics_computed_at desc)
  where analytics_snapshot is not null;

comment on column public.sleep_logs.analytics_snapshot is
  'Validated deterministic SleepDerm calculation derived only from persisted/user-entered sleep records.';
comment on column public.sleep_logs.analytics_source is
  'Execution provenance for the deterministic calculation; never an ML or diagnostic claim.';
