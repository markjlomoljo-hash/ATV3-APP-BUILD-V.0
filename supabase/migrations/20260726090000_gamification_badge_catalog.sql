-- Gamification badge catalog.
--
-- Seeds catalog DEFINITIONS only (public.badges) — never user progress. The
-- award decision is made server-side by the documented threshold rules in
-- src/lib/acnetrex/gamification/rules.ts (BADGE_RULES); user_badges rows are
-- inserted only when a user's real persisted adherence history satisfies a
-- rule. The `criteria` column mirrors each rule's metric and threshold so the
-- catalog is self-describing.
--
-- Forward-only; idempotent via the live UNIQUE (code) constraint.

insert into public.badges (code, title, description, icon, criteria)
values
  (
    'first_task_complete',
    'First Step',
    'Complete your first treatment task.',
    'sparkles',
    '{"metric": "completed_task_count", "threshold": 1}'::jsonb
  ),
  (
    'task_builder_25',
    'Task Builder',
    'Complete 25 treatment tasks.',
    'hammer',
    '{"metric": "completed_task_count", "threshold": 25}'::jsonb
  ),
  (
    'task_master_100',
    'Task Master',
    'Complete 100 treatment tasks.',
    'trophy',
    '{"metric": "completed_task_count", "threshold": 100}'::jsonb
  ),
  (
    'checkin_consistent_7',
    'Consistent Week',
    'Record 7 adherent treatment check-ins.',
    'calendar-check',
    '{"metric": "adherent_checkin_count", "threshold": 7}'::jsonb
  ),
  (
    'checkin_consistent_30',
    'Consistent Month',
    'Record 30 adherent treatment check-ins.',
    'calendar-heart',
    '{"metric": "adherent_checkin_count", "threshold": 30}'::jsonb
  ),
  (
    'streak_7',
    'Streak Week',
    'Reach a 7-day adherence streak.',
    'flame',
    '{"metric": "longest_streak", "threshold": 7}'::jsonb
  ),
  (
    'streak_30',
    'Streak Month',
    'Reach a 30-day adherence streak.',
    'fire',
    '{"metric": "longest_streak", "threshold": 30}'::jsonb
  )
on conflict (code) do nothing;
