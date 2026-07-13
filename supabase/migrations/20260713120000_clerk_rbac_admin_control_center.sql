-- Clerk is the web/admin identity provider. Supabase remains the data store.
-- Clerk text IDs are never cast to auth.users UUIDs; an explicit mapping is
-- available when a product user has both identities.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.clerk_identity_map (
  clerk_user_id text primary key check (clerk_user_id ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  supabase_user_id uuid unique references auth.users(id) on delete cascade,
  mapped_at timestamptz not null default now(),
  mapped_by_clerk_user_id text
);

create table if not exists public.clerk_role_history (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null check (clerk_user_id ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  role text not null check (role in ('owner', 'admin', 'moderator', 'support', 'analyst', 'clinical_reviewer', 'user')),
  role_version integer not null check (role_version > 0),
  assigned_by_clerk_user_id text not null,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists clerk_role_history_user_assigned_idx
  on public.clerk_role_history(clerk_user_id, assigned_at desc);

create table if not exists public.admin_break_glass_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_clerk_user_id text not null,
  target_clerk_user_id text not null,
  scope text not null check (scope in ('raw_face_scans', 'cutisai_conversations', 'cycle_records', 'treatment_details', 'private_reports', 'detailed_health_logs')),
  reason text not null check (length(trim(reason)) between 10 and 2000),
  case_id text not null check (length(trim(case_id)) between 3 and 160),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists admin_break_glass_target_expiry_idx
  on public.admin_break_glass_sessions(target_clerk_user_id, expires_at)
  where revoked_at is null;

alter table if exists public.audit_logs add column if not exists actor_clerk_user_id text;
alter table if exists public.audit_logs add column if not exists target_clerk_user_id text;
alter table if exists public.audit_logs add column if not exists reason text;
alter table if exists public.audit_logs add column if not exists role_version integer;
alter table if exists public.audit_logs add column if not exists request_id text;

create or replace function private.prevent_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'audit_logs_are_append_only';
end;
$$;

revoke all on function private.prevent_admin_audit_mutation() from public, anon, authenticated;

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function private.prevent_admin_audit_mutation();

alter table public.clerk_identity_map enable row level security;
alter table public.clerk_role_history enable row level security;
alter table public.admin_break_glass_sessions enable row level security;

revoke all on public.clerk_identity_map, public.clerk_role_history, public.admin_break_glass_sessions from anon, authenticated;
grant select, insert, update on public.clerk_identity_map, public.clerk_role_history, public.admin_break_glass_sessions to service_role;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
