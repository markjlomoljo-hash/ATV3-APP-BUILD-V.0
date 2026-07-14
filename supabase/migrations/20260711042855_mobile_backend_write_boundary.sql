-- Enforce the mobile -> FastAPI -> Supabase write boundary.
-- Authenticated clients retain RLS-scoped reads. All database mutations are
-- server-owned so clients cannot forge intelligence, points, status fields, or
-- audit history. Private Storage keeps its separate owner-folder policies.

revoke insert, update, delete on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;

-- Request and derived tables previously had owner FOR ALL policies. Replace
-- them with read-only transparency; FastAPI/service_role performs mutations.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'report_requests', 'export_requests', 'deletion_requests',
    'cutisai_conversations', 'user_memory_events'
  ] loop
    execute format('drop policy if exists "owner rows" on public.%I', table_name);
    execute format('drop policy if exists "owner read" on public.%I', table_name);
    execute format(
      'create policy "owner read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );
  end loop;
end $$;

-- Legacy derived state is never client-writable even if old policy definitions
-- remain for backwards schema readability.
revoke insert, update, delete on public.gamification from authenticated;
revoke insert, update, delete on public.user_badges from authenticated;
revoke insert, update, delete on public.forecasts from authenticated;
revoke insert, update, delete on public.trigger_hypotheses from authenticated;
revoke insert, update, delete on public.skin_twin_snapshots from authenticated;
revoke insert, update, delete on public.reports from authenticated;
revoke insert, update, delete on public.ml_runtime_events from authenticated;
