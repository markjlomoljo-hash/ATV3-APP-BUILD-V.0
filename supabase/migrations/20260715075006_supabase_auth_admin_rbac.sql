-- Canonical Supabase Auth/RBAC layer. Clerk tables remain for rollback compatibility.
alter type public.app_role add value if not exists 'owner';
alter type public.app_role add value if not exists 'moderator';
alter type public.app_role add value if not exists 'support';
alter type public.app_role add value if not exists 'analyst';
alter type public.app_role add value if not exists 'clinical_reviewer';

alter table public.user_roles add column if not exists role_version integer not null default 1;
alter table public.user_roles add column if not exists account_status text not null default 'active';
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();
alter table public.user_roles add constraint user_roles_account_status_check check (account_status in ('active','suspended','restricted'));

create table if not exists public.supabase_role_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  role_version integer not null,
  assigned_by_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists supabase_role_history_user_idx on public.supabase_role_history(user_id, created_at desc);
alter table public.supabase_role_history enable row level security;

alter table public.audit_logs add column if not exists actor_supabase_user_id uuid references auth.users(id) on delete set null;
alter table public.audit_logs add column if not exists target_supabase_user_id uuid references auth.users(id) on delete set null;
create index if not exists audit_logs_actor_supabase_idx on public.audit_logs(actor_supabase_user_id, created_at desc);

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security invoker set search_path = public, private as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = _user_id and (ur.role = _role or (_role = 'admin'::public.app_role and ur.role = 'owner'::public.app_role)));
$$;
