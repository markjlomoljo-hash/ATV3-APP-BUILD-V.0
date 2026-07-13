-- Forward-only least-privilege repair based on the 2026-07-14 live grant/advisor audit.
-- User-facing mutations go through the authenticated application API; RLS remains
-- defense in depth for the owner-scoped reads that stay granted.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
revoke all privileges on all sequences in schema public from authenticated;

-- Prevent the original broad grants from returning on objects created by postgres.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke insert, update, delete, truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;

-- Governance, audit, raw lineage, and administrative state are server-only.
revoke select on public.ml_model_versions, public.ml_dataset_versions, public.ml_training_runs,
  public.ml_feature_snapshots, public.intelligence_events, public.audit_logs,
  public.ml_runtime_events, public.ml_service_idempotency, public.ml_service_jobs,
  public.admin_break_glass_sessions, public.clerk_identity_map, public.clerk_role_history
from anon, authenticated;

-- These owner-read policies duplicate an existing authenticated owner-scoped ALL
-- policy. Removing only the duplicate preserves access while reducing policy work.
drop policy if exists "owner read" on public.cutisai_conversations;
drop policy if exists "owner read" on public.deletion_audit_events;
drop policy if exists "owner read" on public.deletion_requests;
drop policy if exists "owner read" on public.export_requests;
drop policy if exists "owner read" on public.memory_retrieval_logs;
drop policy if exists "owner read" on public.ml_analysis_jobs;
drop policy if exists "owner read" on public.ml_analysis_results;
drop policy if exists "owner read" on public.profile_audit_events;
drop policy if exists "owner read" on public.report_requests;
drop policy if exists "owner read" on public.user_memory_events;
drop policy if exists "owner read" on public.user_memory_facts;
drop policy if exists "owner read" on public.user_memory_summaries;

commit;
