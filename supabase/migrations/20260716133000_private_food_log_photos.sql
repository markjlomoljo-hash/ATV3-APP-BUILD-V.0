begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-log-photos',
  'food-log-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "food photo owner read" on storage.objects;
create policy "food photo owner read"
on storage.objects for select to authenticated
using (
  bucket_id = 'food-log-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "food photo owner insert" on storage.objects;
create policy "food photo owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'food-log-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "food photo owner delete" on storage.objects;
create policy "food photo owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'food-log-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

commit;
