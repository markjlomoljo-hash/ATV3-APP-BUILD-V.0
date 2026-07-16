-- Schema-only SCIN governance evidence boundary.
-- Deliberately stores no approval, consent, PHI, split, or quality assertions.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.split_manifest (
  id uuid primary key default gen_random_uuid(),
  dataset_name text not null,
  dataset_version text not null,
  split_name text not null check (split_name in ('train', 'validation', 'test')),
  case_count integer not null check (case_count >= 0),
  image_count integer not null check (image_count >= 0),
  gradable_count integer not null check (gradable_count >= 0 and gradable_count <= image_count),
  sha256_hash text not null check (sha256_hash ~ '^[0-9a-f]{64}$'),
  evidence jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (dataset_name, dataset_version, split_name),
  foreign key (dataset_name, dataset_version)
    references public.ml_dataset_versions(dataset_name, dataset_version)
    on update cascade on delete cascade
);

create table if not exists public.consent_review (
  id uuid primary key default gen_random_uuid(),
  dataset_name text not null,
  dataset_version text not null,
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'rejected', 'expired')),
  source text,
  purpose_compatibility text,
  restrictions text[] not null default '{}'::text[],
  evidence jsonb not null default '{}'::jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dataset_name, dataset_version),
  foreign key (dataset_name, dataset_version)
    references public.ml_dataset_versions(dataset_name, dataset_version)
    on update cascade on delete cascade,
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);

alter table public.split_manifest enable row level security;
alter table public.consent_review enable row level security;

revoke all on public.split_manifest, public.consent_review from anon, authenticated;
grant select, insert, update, delete on public.split_manifest, public.consent_review to service_role;

drop policy if exists "service role only" on public.split_manifest;
create policy "service role only" on public.split_manifest
  for all to service_role using (true) with check (true);

drop policy if exists "service role only" on public.consent_review;
create policy "service role only" on public.consent_review
  for all to service_role using (true) with check (true);

comment on table public.split_manifest is
  'Immutable-by-policy evidence for case-disjoint governed dataset splits.';
comment on table public.consent_review is
  'Human-authorized dataset rights evidence; pending by default and never auto-promoted.';

commit;
