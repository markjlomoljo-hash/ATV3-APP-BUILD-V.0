-- Read-only owner visibility for deletion progress; all mutations remain server-mediated.
drop policy if exists "owner deletion job read" on public.deletion_jobs;
create policy "owner deletion job read" on public.deletion_jobs for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "service role only" on public.api_idempotency_keys;
create policy "service role only" on public.api_idempotency_keys for all to service_role using (true) with check (true);
drop policy if exists "service role only" on public.outbox_events;
create policy "service role only" on public.outbox_events for all to service_role using (true) with check (true);
drop policy if exists "service role only" on public.consumer_inbox;
create policy "service role only" on public.consumer_inbox for all to service_role using (true) with check (true);

