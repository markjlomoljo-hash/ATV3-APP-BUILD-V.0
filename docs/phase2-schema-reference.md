# Phase 2 Supabase Schema Reference

## acne_history
id(uuid), user_id(uuid), onset_age(int), duration_years(numeric), severity(text), flare_frequency(text), self_assessment(text), notes(text), created_at, updated_at

## daily_logs
id(text), user_id(text), log_date(text), sleep(jsonb), food(jsonb), stress_level(int), activity(jsonb), notes(text), created_at, updated_at
NOTE: user_id is TEXT (cast from UUID)

## sleep_logs
id(uuid), user_id(uuid), log_date(date), sleep_time(timestamptz), wake_time(timestamptz), quality(int), disturbances(jsonb), naps(jsonb), notes(text), created_at, updated_at

## food_logs
id(uuid), user_id(uuid), log_date(date), meal_type(text), is_baseline(bool), items(jsonb), categories(jsonb), completed(bool), notes(text), created_at, updated_at

## treatment_plans
id(uuid), user_id(uuid), title(text), description(text), schedule(jsonb), status(text), adherence_pct(numeric), safety_flags(jsonb), started_at(timestamptz), ended_at(timestamptz), created_at, updated_at

## treatment_checkins
id(text), plan_id(text), user_id(text), checkin_date(text), status(text), irritation(int), notes(text), created_at
NOTE: user_id is TEXT

## treatment_tasks
id(uuid), plan_id(uuid), user_id(uuid), task_name(text), due_at(timestamptz), completed_at(timestamptz), skipped(bool), metadata(jsonb), created_at, updated_at

## gamification
id(uuid), user_id(uuid), current_streak(int), longest_streak(int), points(int), rank(text), pet_stage(text), pet_xp(int), last_action_at(timestamptz), created_at, updated_at

## badges
id(uuid), code(text), title(text), description(text), icon(text), criteria(jsonb), created_at

## user_badges
id(uuid), user_id(uuid), badge_id(uuid), earned_at(timestamptz)

## notifications
id(uuid), user_id(uuid), category(text), title(text), body(text), scheduled_at(timestamptz), sent_at(timestamptz), read_at(timestamptz), payload(jsonb), created_at

## notification_preferences
id(uuid), user_id(uuid), push_enabled(bool), email_enabled(bool), quiet_hours(jsonb), categories(jsonb), created_at, updated_at

## weather_snapshots
id(uuid), user_id(uuid), recorded_at(timestamptz), coarse_lat(numeric), coarse_lon(numeric), temperature_c(numeric), humidity_pct(numeric), uv_index(numeric), aqi(numeric), pollen(jsonb), confidence(numeric), source(text)

## lifestyle_triggers
id(uuid), user_id(uuid), sleep_schedule(jsonb), stress_level(text), diet_patterns(jsonb), hydration_liters(numeric), exercise_frequency(text), occlusion_exposures(jsonb), created_at, updated_at

## MISSING TABLES (need migration):
- skin_state_logs: daily acne activity journal
- activity_logs: exercise/sweat/activity
- hydration_logs: daily water intake
- contact_events: pillowcase/phone/picking events
- routine_logs: daily routine adherence
- cycle_logs: menstrual/hormonal context (consent-gated)
- points_ledger: append-only points history
- streak_restores: streak restore audit (max 3/month)
