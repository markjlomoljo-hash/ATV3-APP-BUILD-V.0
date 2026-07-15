-- Forward-only durable deletion delivery and audit-retention contract.
-- Destructive work remains server-mediated. This migration does not erase user
-- data, storage objects, or Supabase Auth identities.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.deletion_requests
  add column if not exists idempotency_key text,
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists current_step text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error_code text,
  add column if not exists tombstone_id uuid;

update public.deletion_requests
set tombstone_id=gen_random_uuid()
where tombstone_id is null;

alter table public.deletion_requests
  alter column tombstone_id set not null,
  alter column user_id drop not null;

-- Account deletion must not erase the durable request/tombstone record.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname from pg_constraint
    where conrelid='public.deletion_requests'::regclass
      and contype='f' and confrelid='auth.users'::regclass
  loop
    execute format(
      'alter table public.deletion_requests drop constraint %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.deletion_requests
  add constraint deletion_requests_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null not valid;
alter table public.deletion_requests validate constraint deletion_requests_user_id_fkey;

update public.deletion_requests
set status=case
    when status in ('pending','scheduled','processing','completed','cancelled','failed','blocked') then status
    else 'failed'
  end,
  current_step=case
    when status='cancelled' then 'cancelled'
    when status='completed' then 'completed'
    when current_step in (
      'awaiting_grace_period','revoke_identity','delete_media','erase_data',
      'delete_auth_identity','cancelled','completed'
    ) then current_step
    else 'awaiting_grace_period'
  end,
  last_error_code=case
    when status in ('pending','scheduled','processing','completed','cancelled','failed','blocked')
      then last_error_code
    else 'legacy_deletion_status_invalid'
  end,
  updated_at=now();

alter table public.deletion_requests drop constraint if exists deletion_requests_status_check;
alter table public.deletion_requests add constraint deletion_requests_status_check
  check (status in ('pending','scheduled','processing','completed','cancelled','failed','blocked')) not valid;
alter table public.deletion_requests validate constraint deletion_requests_status_check;

alter table public.deletion_requests drop constraint if exists deletion_requests_attempt_count_check;
alter table public.deletion_requests add constraint deletion_requests_attempt_count_check
  check (attempt_count >= 0) not valid;
alter table public.deletion_requests validate constraint deletion_requests_attempt_count_check;

alter table public.deletion_requests drop constraint if exists deletion_requests_target_check;
alter table public.deletion_requests add constraint deletion_requests_target_check
  check (
    (request_type='record' and target_table is not null and target_id is not null)
    or (request_type<>'record' and target_table is null and target_id is null)
  ) not valid;
alter table public.deletion_requests validate constraint deletion_requests_target_check;

do $$
begin
  if exists (
    select 1 from public.deletion_requests
    where user_id is not null and status in ('pending','scheduled','processing')
    group by user_id having count(*) > 1
  ) then
    raise exception 'multiple active deletion requests require operator reconciliation';
  end if;
end $$;

create unique index if not exists deletion_requests_one_active_user_idx
  on public.deletion_requests(user_id)
  where user_id is not null and status in ('pending', 'scheduled', 'processing');
create unique index if not exists deletion_requests_user_idempotency_idx
  on public.deletion_requests(user_id,idempotency_key)
  where user_id is not null and idempotency_key is not null;

alter table public.deletion_jobs
  alter column user_id drop not null,
  alter column deletion_request_id drop not null;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname from pg_constraint
    where conrelid='public.deletion_jobs'::regclass and contype='f'
      and confrelid in ('auth.users'::regclass,'public.deletion_requests'::regclass)
  loop
    execute format(
      'alter table public.deletion_jobs drop constraint %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.deletion_jobs
  add constraint deletion_jobs_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null not valid,
  add constraint deletion_jobs_request_id_fkey
    foreign key (deletion_request_id) references public.deletion_requests(id) on delete set null not valid;
alter table public.deletion_jobs validate constraint deletion_jobs_user_id_fkey;
alter table public.deletion_jobs validate constraint deletion_jobs_request_id_fkey;

update public.deletion_jobs j
set status=case
    when j.status in ('queued','completed','cancelled','dead_letter','blocked') then j.status
    when j.status='leased' and j.lease_owner is not null and j.lease_expires_at is not null then 'leased'
    when j.status in ('processing','pending','scheduled','failed') then 'queued'
    else 'dead_letter'
  end,
  current_step=case
    when j.current_step in ('revoke_identity','delete_media','erase_data','delete_auth_identity','cancelled','completed')
      then j.current_step
    when r.request_type='account' then 'revoke_identity'
    when r.request_type in ('face_images','all_health_data') then 'delete_media'
    else 'erase_data'
  end,
  lease_owner=case
    when j.status='leased' and j.lease_owner is not null and j.lease_expires_at is not null
      then j.lease_owner else null end,
  lease_expires_at=case
    when j.status='leased' and j.lease_owner is not null and j.lease_expires_at is not null
      then j.lease_expires_at else null end,
  last_error_code=case
    when j.status in ('queued','leased','completed','cancelled','dead_letter','blocked')
      then j.last_error_code
    when j.status in ('processing','pending','scheduled','failed') then 'legacy_deletion_job_requeued'
    else 'legacy_deletion_job_status_invalid'
  end,
  updated_at=now()
from public.deletion_requests r
where r.id=j.deletion_request_id;

alter table public.deletion_jobs drop constraint if exists deletion_jobs_status_check;
alter table public.deletion_jobs add constraint deletion_jobs_status_check
  check (status in ('queued','leased','completed','cancelled','dead_letter','blocked')) not valid;
alter table public.deletion_jobs validate constraint deletion_jobs_status_check;

alter table public.deletion_jobs drop constraint if exists deletion_jobs_lease_state_check;
alter table public.deletion_jobs add constraint deletion_jobs_lease_state_check
  check (
    (status='leased' and lease_owner is not null and lease_expires_at is not null)
    or (status<>'leased' and lease_owner is null and lease_expires_at is null)
  ) not valid;
alter table public.deletion_jobs validate constraint deletion_jobs_lease_state_check;

alter table public.deletion_jobs drop constraint if exists deletion_jobs_attempt_bounds_check;
alter table public.deletion_jobs add constraint deletion_jobs_attempt_bounds_check
  check (attempt_count >= 0 and max_attempts between 1 and 100) not valid;
alter table public.deletion_jobs validate constraint deletion_jobs_attempt_bounds_check;

alter table public.deletion_jobs drop constraint if exists deletion_jobs_completed_steps_check;
alter table public.deletion_jobs add constraint deletion_jobs_completed_steps_check
  check (jsonb_typeof(completed_steps)='array' and octet_length(completed_steps::text) <= 4096) not valid;
alter table public.deletion_jobs validate constraint deletion_jobs_completed_steps_check;

alter table public.deletion_jobs drop constraint if exists deletion_jobs_current_step_check;
alter table public.deletion_jobs add constraint deletion_jobs_current_step_check
  check (current_step in (
    'revoke_identity','delete_media','erase_data','delete_auth_identity','cancelled','completed'
  )) not valid;
alter table public.deletion_jobs validate constraint deletion_jobs_current_step_check;

create index if not exists deletion_jobs_request_id_idx
  on public.deletion_jobs(deletion_request_id);
create index if not exists deletion_jobs_user_created_idx
  on public.deletion_jobs(user_id,created_at desc);
create index if not exists deletion_outbox_aggregate_idx
  on public.outbox_events(aggregate_type,aggregate_id)
  where event_type='deletion.requested';

-- Audit evidence is pseudonymized through tombstone_id and survives both Auth
-- identity deletion and any later request-row retention cleanup.
alter table public.deletion_audit_events
  add column if not exists tombstone_id uuid,
  add column if not exists retention_class text not null default 'deletion_evidence';

update public.deletion_audit_events a
set tombstone_id=r.tombstone_id
from public.deletion_requests r
where r.id=a.deletion_request_id and a.tombstone_id is null;
update public.deletion_audit_events
set tombstone_id=gen_random_uuid()
where tombstone_id is null;

alter table public.deletion_audit_events alter column tombstone_id set not null;
alter table public.deletion_audit_events alter column user_id drop not null;
alter table public.deletion_audit_events alter column deletion_request_id drop not null;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname from pg_constraint
    where conrelid='public.deletion_audit_events'::regclass and contype='f'
      and confrelid in ('auth.users'::regclass,'public.deletion_requests'::regclass)
  loop
    execute format(
      'alter table public.deletion_audit_events drop constraint %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.deletion_audit_events
  add constraint deletion_audit_events_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null not valid,
  add constraint deletion_audit_events_request_id_fkey
    foreign key (deletion_request_id) references public.deletion_requests(id) on delete set null not valid,
  add constraint deletion_audit_events_retention_class_check
    check (retention_class='deletion_evidence') not valid;
alter table public.deletion_audit_events validate constraint deletion_audit_events_user_id_fkey;
alter table public.deletion_audit_events validate constraint deletion_audit_events_request_id_fkey;
alter table public.deletion_audit_events validate constraint deletion_audit_events_retention_class_check;

create schema if not exists private;
create or replace function private.enforce_deletion_audit_append_only()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  -- FK-driven pseudonymization may null identity/reference columns. All other
  -- changes and every physical delete remain forbidden.
  if tg_op='UPDATE'
     and new.id=old.id
     and (new.user_id is not distinct from old.user_id or new.user_id is null)
     and (new.deletion_request_id is not distinct from old.deletion_request_id
       or new.deletion_request_id is null)
     and new.tombstone_id=old.tombstone_id
     and new.event_type=old.event_type
     and new.metadata=old.metadata
     and new.retention_class=old.retention_class
     and new.created_at=old.created_at then
    return new;
  end if;
  raise exception 'deletion audit events are append-only' using errcode='55000';
end;
$$;

revoke all on function private.enforce_deletion_audit_append_only() from public,anon,authenticated;
drop trigger if exists deletion_audit_events_append_only on public.deletion_audit_events;
create trigger deletion_audit_events_append_only
before update or delete on public.deletion_audit_events
for each row execute function private.enforce_deletion_audit_append_only();

alter table public.deletion_requests enable row level security;
alter table public.deletion_jobs enable row level security;
alter table public.deletion_audit_events enable row level security;

drop policy if exists "owner rows" on public.deletion_requests;
drop policy if exists "owner read" on public.deletion_requests;
drop policy if exists "owner deletion request read" on public.deletion_requests;
create policy "owner deletion request read" on public.deletion_requests
  for select to authenticated using ((select auth.uid())=user_id);

drop policy if exists "owner deletion job read" on public.deletion_jobs;
create policy "owner deletion job read" on public.deletion_jobs
  for select to authenticated using ((select auth.uid())=user_id);

drop policy if exists "owner read" on public.deletion_audit_events;
drop policy if exists "owner deletion audit read" on public.deletion_audit_events;
create policy "owner deletion audit read" on public.deletion_audit_events
  for select to authenticated using ((select auth.uid())=user_id);

grant select on public.deletion_requests,public.deletion_jobs,public.deletion_audit_events
  to authenticated;
revoke insert,update,delete,truncate,references,trigger
  on public.deletion_requests,public.deletion_jobs,public.deletion_audit_events
  from authenticated;
revoke all on public.deletion_requests,public.deletion_jobs,public.deletion_audit_events
  from anon;

grant select,insert,update on public.deletion_requests,public.deletion_jobs to service_role;
revoke delete on public.deletion_requests,public.deletion_jobs from service_role;
grant select,insert on public.deletion_audit_events to service_role;
revoke update,delete,truncate on public.deletion_audit_events from service_role;

commit;
