-- Forward-only reconciliation for the durable Expo -> API -> outbox -> worker -> result path.
-- It aligns clean replays with the constrained lifecycle already present in production.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Processing permission is a separate purpose from personalization/learning and
-- raw-image retention. Existing consent rows remain denied until the user opts in.
alter table public.consents
  add column if not exists personal_processing boolean not null default false,
  add column if not exists raw_image_processing boolean not null default false;

alter table public.outbox_events drop constraint if exists outbox_events_status_check;

update public.outbox_events
set status = case status
  when 'processing' then 'leased'
  when 'failed' then 'dead_letter'
  when 'pending' then 'pending'
  when 'leased' then 'leased'
  when 'processed' then 'processed'
  when 'failed_retryable' then 'failed_retryable'
  when 'dead_letter' then 'dead_letter'
  else 'dead_letter'
end,
lease_owner = case when status in ('processing', 'leased') then lease_owner else null end,
lease_expires_at = case when status in ('processing', 'leased') then lease_expires_at else null end,
updated_at = now();

alter table public.outbox_events add constraint outbox_events_status_check
  check (status in ('pending', 'leased', 'processed', 'failed_retryable', 'dead_letter')) not valid;
alter table public.outbox_events validate constraint outbox_events_status_check;

alter table public.outbox_events drop constraint if exists outbox_events_lease_state_check;
alter table public.outbox_events add constraint outbox_events_lease_state_check
  check (
    (status = 'leased' and lease_owner is not null and lease_expires_at is not null)
    or (status <> 'leased' and lease_owner is null and lease_expires_at is null)
  ) not valid;
alter table public.outbox_events validate constraint outbox_events_lease_state_check;

alter table public.outbox_events drop constraint if exists outbox_events_attempt_count_check;
alter table public.outbox_events add constraint outbox_events_attempt_count_check
  check (attempt_count >= 0) not valid;
alter table public.outbox_events validate constraint outbox_events_attempt_count_check;

alter table public.outbox_events drop constraint if exists outbox_events_max_attempts_check;
alter table public.outbox_events add constraint outbox_events_max_attempts_check
  check (max_attempts between 1 and 100) not valid;
alter table public.outbox_events validate constraint outbox_events_max_attempts_check;

alter table public.outbox_events drop constraint if exists outbox_events_payload_size_check;
alter table public.outbox_events add constraint outbox_events_payload_size_check
  check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536) not valid;
alter table public.outbox_events validate constraint outbox_events_payload_size_check;

-- Remove legacy broad policies and define the API's defense-in-depth read boundary explicitly.
drop policy if exists "Users own ml_analysis_jobs rows" on public.ml_analysis_jobs;
drop policy if exists "Users own ml_analysis_results rows" on public.ml_analysis_results;
drop policy if exists "owner read" on public.ml_analysis_jobs;
drop policy if exists "owner read" on public.ml_analysis_results;

create policy "owner read" on public.ml_analysis_jobs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "owner read" on public.ml_analysis_results for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.ml_analysis_jobs, public.ml_analysis_results to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.ml_analysis_jobs, public.ml_analysis_results from authenticated;

alter table public.outbox_events enable row level security;
alter table public.consumer_inbox enable row level security;
revoke all on public.outbox_events, public.consumer_inbox from anon, authenticated;
grant select, insert, update, delete on public.outbox_events, public.consumer_inbox to service_role;

commit;
