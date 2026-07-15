-- Preserve append-only audit evidence when an Auth account is deleted.
-- The only permitted audit-row mutation is the FK-driven anonymization of user_id.

create or replace function private.prevent_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and old.user_id is not null
     and new.user_id is null
     and (to_jsonb(new) - 'user_id') is not distinct from
         (to_jsonb(old) - 'user_id') then
    return new;
  end if;

  raise exception 'audit_logs_are_append_only';
end;
$$;

revoke all on function private.prevent_admin_audit_mutation() from public, anon, authenticated;

alter table public.audit_logs
  drop constraint if exists audit_logs_user_id_fkey;

alter table public.audit_logs
  add constraint audit_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
