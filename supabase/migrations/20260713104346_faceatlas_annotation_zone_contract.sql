-- FaceAtlas user annotations need an explicit facial zone for longitudinal
-- aggregation. The existing annotations table remains the source of truth;
-- this extends it without creating a parallel annotation table.
alter table if exists public.annotations
  add column if not exists zone text;

alter table if exists public.annotations
  drop constraint if exists annotations_zone_check;

alter table if exists public.annotations
  add constraint annotations_zone_check
  check (zone is null or zone in (
    'forehead', 'left_cheek', 'right_cheek', 'chin', 'jawline', 'nose',
    'temple', 'perioral'
  ));

create index if not exists idx_annotations_user_scan_created
  on public.annotations(user_id, scan_id, created_at desc);
