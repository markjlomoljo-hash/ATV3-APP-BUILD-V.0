-- AcneTrex V3 Supabase legacy-schema security and performance hardening.
-- This follows the applied Phase 7 contracts and does not alter user data.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

revoke all on function private.has_role(uuid, public.app_role) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

-- This event-trigger function is infrastructure-only and must never be an RPC.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

-- Replace legacy tenant policies with init-plan-safe auth checks and a private
-- role helper. The owner remains the only identity allowed by WITH CHECK.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'acne_history', 'annotations', 'face_scans', 'food_logs', 'forecasts',
    'gamification', 'goals_constraints', 'lifestyle_triggers',
    'migration_imports', 'notification_preferences', 'notifications',
    'reports', 'routine_products', 'skin_twin_snapshots', 'skin_type_barrier',
    'sleep_logs', 'treatment_plans', 'treatment_tasks', 'trigger_hypotheses',
    'user_badges', 'weather_snapshots'
  ] loop
    execute format('drop policy if exists "own rows" on public.%I', table_name);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (((select auth.uid()) = user_id) or (select private.has_role(auth.uid(), ''admin''::public.app_role))) with check ((select auth.uid()) = user_id)',
      table_name
    );
  end loop;
end $$;

drop policy if exists "own profile" on public.profiles;
create policy "own profile"
on public.profiles for all to authenticated
using (
  (select auth.uid()) = user_id
  or (select private.has_role(auth.uid(), 'admin'::public.app_role))
)
with check ((select auth.uid()) = user_id);

drop policy if exists "own consent" on public.consents;
create policy "own consent"
on public.consents for all to authenticated
using (
  (select auth.uid()) = user_id
  or (select private.has_role(auth.uid(), 'admin'::public.app_role))
)
with check ((select auth.uid()) = user_id);

-- Consolidate role reads and separate administrator writes to avoid overlapping
-- permissive SELECT policies.
drop policy if exists "admins manage roles" on public.user_roles;
drop policy if exists "users read own roles" on public.user_roles;
create policy "role read"
on public.user_roles for select to authenticated
using (
  (select auth.uid()) = user_id
  or (select private.has_role(auth.uid(), 'admin'::public.app_role))
);
create policy "admin role insert"
on public.user_roles for insert to authenticated
with check ((select private.has_role(auth.uid(), 'admin'::public.app_role)));
create policy "admin role update"
on public.user_roles for update to authenticated
using ((select private.has_role(auth.uid(), 'admin'::public.app_role)))
with check ((select private.has_role(auth.uid(), 'admin'::public.app_role)));
create policy "admin role delete"
on public.user_roles for delete to authenticated
using ((select private.has_role(auth.uid(), 'admin'::public.app_role)));

-- Catalogs are authenticated-readable; administrator writes are split by
-- operation so they do not create a second permissive SELECT policy.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['badges', 'products', 'product_ingredients'] loop
    execute format('drop policy if exists "catalog admin write" on public.%I', table_name);
    execute format('drop policy if exists "catalog admin insert" on public.%I', table_name);
    execute format('drop policy if exists "catalog admin update" on public.%I', table_name);
    execute format('drop policy if exists "catalog admin delete" on public.%I', table_name);
    execute format(
      'create policy "catalog admin insert" on public.%I for insert to authenticated with check ((select private.has_role(auth.uid(), ''admin''::public.app_role)))',
      table_name
    );
    execute format(
      'create policy "catalog admin update" on public.%I for update to authenticated using ((select private.has_role(auth.uid(), ''admin''::public.app_role))) with check ((select private.has_role(auth.uid(), ''admin''::public.app_role)))',
      table_name
    );
    execute format(
      'create policy "catalog admin delete" on public.%I for delete to authenticated using ((select private.has_role(auth.uid(), ''admin''::public.app_role)))',
      table_name
    );
  end loop;
end $$;

-- Storage access remains direct from the native client, but each operation is
-- limited to the authenticated user's first path segment.
drop policy if exists "own folder read" on storage.objects;
create policy "own folder read"
on storage.objects for select to authenticated
using (
  bucket_id = any (array['face-scans-raw', 'reports', 'skin-twin'])
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "own folder insert" on storage.objects;
create policy "own folder insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = any (array['face-scans-raw', 'reports', 'skin-twin'])
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "own folder delete" on storage.objects;
create policy "own folder delete"
on storage.objects for delete to authenticated
using (
  bucket_id = any (array['face-scans-raw', 'reports', 'skin-twin'])
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Cover every foreign key reported by the performance advisor.
create index if not exists idx_annotations_user_id on public.annotations(user_id);
create index if not exists cutisai_messages_user_id_idx on public.cutisai_messages(user_id);
create index if not exists deletion_audit_events_user_id_idx on public.deletion_audit_events(user_id);
create index if not exists deletion_requests_user_id_idx on public.deletion_requests(user_id);
create index if not exists export_files_user_id_idx on public.export_files(user_id);
create index if not exists memory_retrieval_logs_conversation_idx on public.memory_retrieval_logs(conversation_id);
create index if not exists ml_fallback_events_job_idx on public.ml_fallback_events(analysis_job_id);
create index if not exists ml_training_runs_dataset_idx on public.ml_training_runs(dataset_version_id);
create index if not exists ml_training_runs_model_idx on public.ml_training_runs(model_version_id);
create index if not exists report_consent_snapshots_user_id_idx on public.report_consent_snapshots(user_id);
create index if not exists report_files_user_id_idx on public.report_files(user_id);
create index if not exists report_jobs_user_id_idx on public.report_jobs(user_id);

-- No policy references the public helper after this point; remove its RPC path.
drop function if exists public.has_role(uuid, public.app_role);
