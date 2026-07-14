-- Live-applied reliability contract. Server-only tables deliberately expose no
-- anon/authenticated write policies; application routes authenticate first.
create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  scope text not null,
  idempotency_key text not null,
  http_method text not null,
  route text not null,
  request_hash text not null,
  status text not null default 'processing' check (status in ('processing','completed','failed_retryable','failed_terminal','expired')),
  response_status integer,
  response_reference jsonb not null default '{}'::jsonb,
  resource_type text,
  resource_id text,
  locked_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, scope, idempotency_key)
);

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(), event_type text not null,
  aggregate_type text not null, aggregate_id text not null, user_id uuid,
  payload jsonb not null default '{}'::jsonb, deduplication_key text not null unique,
  status text not null default 'pending', attempt_count integer not null default 0,
  max_attempts integer not null default 5, lease_owner text, lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(), last_error_code text,
  processed_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consumer_inbox (
  id uuid primary key default gen_random_uuid(), consumer_name text not null,
  event_id uuid not null references public.outbox_events(id) on delete cascade,
  result_reference jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique (consumer_name, event_id)
);

alter table public.deletion_requests add column if not exists idempotency_key text;
alter table public.deletion_requests add column if not exists grace_period_ends_at timestamptz;
alter table public.deletion_requests add column if not exists current_step text;
alter table public.deletion_requests add column if not exists attempt_count integer not null default 0;
alter table public.deletion_requests add column if not exists last_error_code text;
alter table public.deletion_requests add column if not exists tombstone_id uuid;

create table if not exists public.deletion_jobs (
  id uuid primary key default gen_random_uuid(), deletion_request_id uuid,
  user_id uuid, tombstone_id uuid not null, idempotency_key text not null,
  status text not null default 'queued', current_step text not null default 'requested',
  completed_steps jsonb not null default '[]'::jsonb, attempt_count integer not null default 0,
  max_attempts integer not null default 10, lease_owner text, lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(), last_error_code text,
  grace_period_ends_at timestamptz, identity_revoked_at timestamptz,
  media_deleted_at timestamptz, data_erased_at timestamptz, auth_deleted_at timestamptz,
  completed_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (deletion_request_id), unique (user_id, idempotency_key)
);

create index if not exists api_idempotency_expiry_idx on public.api_idempotency_keys(expires_at);
create index if not exists api_idempotency_status_idx on public.api_idempotency_keys(status);
create index if not exists outbox_dispatch_idx on public.outbox_events(status,next_attempt_at);
create index if not exists deletion_jobs_dispatch_idx on public.deletion_jobs(status,next_attempt_at);

alter table public.api_idempotency_keys enable row level security;
alter table public.outbox_events enable row level security;
alter table public.consumer_inbox enable row level security;
alter table public.deletion_jobs enable row level security;

revoke all on public.api_idempotency_keys, public.outbox_events, public.consumer_inbox from anon, authenticated;
revoke insert, update, delete on public.deletion_jobs from anon, authenticated;

