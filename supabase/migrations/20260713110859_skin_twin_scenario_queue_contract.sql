-- Persist validated Skin Twin scenario requests and their readiness metadata.
-- `simulation` remains null until a real ML worker persists a validated result.
alter table if exists public.skin_twin_snapshots
  add column if not exists scenario_payload jsonb;

alter table if exists public.skin_twin_snapshots
  add column if not exists "window" text;

alter table if exists public.skin_twin_snapshots
  add column if not exists status text not null default 'insufficient_data';

alter table if exists public.skin_twin_snapshots
  add column if not exists source_record_refs jsonb not null default '[]'::jsonb;

alter table if exists public.skin_twin_snapshots
  add column if not exists model_version text;

alter table if exists public.skin_twin_snapshots
  add column if not exists confidence text;

alter table if exists public.skin_twin_snapshots
  add column if not exists uncertainty jsonb;

alter table if exists public.skin_twin_snapshots
  drop constraint if exists skin_twin_snapshots_status_check;

alter table if exists public.skin_twin_snapshots
  add constraint skin_twin_snapshots_status_check
  check (status in ('insufficient_data', 'queued_for_cloud', 'completed', 'failed'));

create index if not exists idx_skin_twin_snapshots_user_status
  on public.skin_twin_snapshots(user_id, status, snapshot_at desc);
