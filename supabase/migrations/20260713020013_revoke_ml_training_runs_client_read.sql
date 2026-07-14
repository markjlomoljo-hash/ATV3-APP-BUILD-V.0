-- ML training lineage is internal operational metadata. It must not be
-- discoverable through the authenticated GraphQL/Data API surface; normal
-- users consume only the explicitly published model/dataset version records.
revoke all privileges on table public.ml_training_runs from anon, authenticated;

-- Keep the service-role boundary explicit and idempotent. RLS remains enabled
-- and the existing service-role-only policy continues to enforce row access.
grant select, insert, update, delete on table public.ml_training_runs to service_role;
