-- One honest user-local food-log parent per day with repeated typed sub-events.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.food_logs
  add column if not exists expected_meal_count integer,
  add column if not exists meal_events jsonb not null default '[]'::jsonb,
  add column if not exists snack_events jsonb not null default '[]'::jsonb,
  add column if not exists completion_state text not null default 'not_started',
  add column if not exists user_marked_complete boolean not null default false,
  add column if not exists baseline_snapshot jsonb not null default '{}'::jsonb;

alter table public.food_logs drop constraint if exists food_logs_expected_meal_count_check;
alter table public.food_logs add constraint food_logs_expected_meal_count_check
  check (expected_meal_count is null or expected_meal_count between 1 and 3) not valid;

alter table public.food_logs drop constraint if exists food_logs_completion_state_check;
alter table public.food_logs add constraint food_logs_completion_state_check check (
  completion_state in (
    'not_started',
    'partially_logged',
    'meals_complete_no_snacks_logged',
    'meals_complete_with_snacks_logged',
    'user_marked_complete',
    'incomplete_but_saved',
    'backfilled',
    'unknown_day',
    'skipped_with_reason',
    'offline_queued'
  )
) not valid;

create temporary table food_log_daily_rollup on commit drop as
select
  user_id,
  log_date,
  min(id::text)::uuid as keeper_id,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'type', meal_type,
        'time', created_at,
        'items', coalesce(items, '[]'::jsonb),
        'tags', coalesce(categories, '[]'::jsonb),
        'is_baseline', is_baseline,
        'notes', notes
      ) order by created_at
    ) filter (where meal_type <> 'snack'),
    '[]'::jsonb
  ) as meal_events,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'time', created_at,
        'description', coalesce(items, '[]'::jsonb),
        'tags', coalesce(categories, '[]'::jsonb),
        'notes', notes,
        'confidence_level', null
      ) order by created_at
    ) filter (where meal_type = 'snack'),
    '[]'::jsonb
  ) as snack_events
from public.food_logs
group by user_id, log_date;

update public.food_logs as target
set meal_type = 'daily',
    items = '[]'::jsonb,
    categories = '[]'::jsonb,
    completed = false,
    meal_events = rollup.meal_events,
    snack_events = rollup.snack_events,
    completion_state = case
      when jsonb_array_length(rollup.meal_events) + jsonb_array_length(rollup.snack_events) = 0
        then 'not_started'
      else 'incomplete_but_saved'
    end,
    updated_at = now()
from food_log_daily_rollup as rollup
where target.id = rollup.keeper_id;

delete from public.food_logs as duplicate
using food_log_daily_rollup as rollup
where duplicate.user_id = rollup.user_id
  and duplicate.log_date = rollup.log_date
  and duplicate.id <> rollup.keeper_id;

alter table public.food_logs alter column meal_type set default 'daily';

create unique index if not exists food_logs_user_date_uidx
  on public.food_logs(user_id, log_date);

alter table public.food_logs validate constraint food_logs_expected_meal_count_check;
alter table public.food_logs validate constraint food_logs_completion_state_check;

comment on column public.food_logs.meal_events is
  'Typed meal sub-events belonging to this single user-local daily parent.';
comment on column public.food_logs.snack_events is
  'Repeated optional snack sub-events; never separate daily parent rows.';

commit;
