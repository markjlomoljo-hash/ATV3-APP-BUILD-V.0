-- Treatment task generation: database-level idempotency backstop.
--
-- Task generation (src/lib/acnetrex/treatment/task-generation.ts) stamps
-- every generated row with metadata.generationKey =
-- planId:date:stepIndex:slot and skips keys that already exist. That
-- app-level read-then-insert alone cannot stop two CONCURRENT generate calls
-- (e.g. web + mobile both auto-generating at day rollover, each with its own
-- idempotency key) from both seeing an empty key set and both inserting the
-- same day's board. This partial unique index makes the database the final
-- arbiter: the generation insert runs with ON CONFLICT DO NOTHING, so the
-- losing call inserts nothing and honestly reports the rows as already
-- existing instead of duplicating user-visible tasks (and, once completed,
-- duplicate points/petXp in recompute).
--
-- Partial: only generated rows carry a generationKey; manually created tasks
-- (metadata null or without the key) are unconstrained, exactly as before.
--
-- Forward-only and idempotent (IF NOT EXISTS). Safe on the live table: the
-- generation feature ships in the same release, so no pre-existing rows can
-- carry conflicting generationKey values.

create unique index if not exists treatment_tasks_user_generation_key_uidx
  on public.treatment_tasks (user_id, ((metadata ->> 'generationKey')))
  where (metadata ->> 'generationKey') is not null;
