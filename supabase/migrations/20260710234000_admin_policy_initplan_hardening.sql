-- Ensure administrator policy checks evaluate auth.uid() once per statement.

drop policy if exists "admin role insert" on public.user_roles;
create policy "admin role insert"
on public.user_roles for insert to authenticated
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "admin role update" on public.user_roles;
create policy "admin role update"
on public.user_roles for update to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "admin role delete" on public.user_roles;
create policy "admin role delete"
on public.user_roles for delete to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

do $$
declare
  table_name text;
begin
  foreach table_name in array array['badges', 'products', 'product_ingredients'] loop
    execute format('drop policy if exists "catalog admin insert" on public.%I', table_name);
    execute format('drop policy if exists "catalog admin update" on public.%I', table_name);
    execute format('drop policy if exists "catalog admin delete" on public.%I', table_name);
    execute format(
      'create policy "catalog admin insert" on public.%I for insert to authenticated with check (private.has_role((select auth.uid()), ''admin''::public.app_role))',
      table_name
    );
    execute format(
      'create policy "catalog admin update" on public.%I for update to authenticated using (private.has_role((select auth.uid()), ''admin''::public.app_role)) with check (private.has_role((select auth.uid()), ''admin''::public.app_role))',
      table_name
    );
    execute format(
      'create policy "catalog admin delete" on public.%I for delete to authenticated using (private.has_role((select auth.uid()), ''admin''::public.app_role))',
      table_name
    );
  end loop;
end $$;
