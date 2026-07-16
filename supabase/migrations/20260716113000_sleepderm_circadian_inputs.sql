-- Persist observable SleepDerm inputs and sourced target configuration.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.sleep_logs
  add column if not exists manual_duration_override integer,
  add column if not exists manual_duration_reason text,
  add column if not exists working_sleep_target numeric,
  add column if not exists target_sleep_range jsonb,
  add column if not exists target_source text,
  add column if not exists timezone text,
  add column if not exists schedule_context text;

alter table public.sleep_logs drop constraint if exists sleep_logs_manual_duration_check;
alter table public.sleep_logs add constraint sleep_logs_manual_duration_check
  check (manual_duration_override is null or manual_duration_override between 1 and 1440) not valid;

alter table public.sleep_logs drop constraint if exists sleep_logs_working_target_check;
alter table public.sleep_logs add constraint sleep_logs_working_target_check
  check (working_sleep_target is null or working_sleep_target between 4 and 14) not valid;

alter table public.sleep_logs drop constraint if exists sleep_logs_target_source_check;
alter table public.sleep_logs add constraint sleep_logs_target_source_check check (
  target_source is null or target_source in (
    'age_default', 'user_selected', 'wearable_estimated', 'clinician_entered'
  )
) not valid;

alter table public.sleep_logs validate constraint sleep_logs_manual_duration_check;
alter table public.sleep_logs validate constraint sleep_logs_working_target_check;
alter table public.sleep_logs validate constraint sleep_logs_target_source_check;

comment on column public.sleep_logs.manual_duration_reason is
  'Required UI explanation when a user overrides calculated duration.';
comment on column public.sleep_logs.target_source is
  'Provenance for the working sleep target; never inferred without a source.';

commit;
