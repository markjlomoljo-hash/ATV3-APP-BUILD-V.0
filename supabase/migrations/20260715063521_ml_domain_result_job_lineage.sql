-- Replay-safe lineage for every ML-owned domain projection.
alter table public.trigger_hypotheses
  add column if not exists source_job_id uuid references public.ml_analysis_jobs(id) on delete set null;
alter table public.forecasts
  add column if not exists source_job_id uuid references public.ml_analysis_jobs(id) on delete set null;
alter table public.forecast_summaries
  add column if not exists source_job_id uuid references public.ml_analysis_jobs(id) on delete set null;
alter table public.skin_twin_snapshots
  add column if not exists source_job_id uuid references public.ml_analysis_jobs(id) on delete set null;
alter table public.cutisai_messages
  add column if not exists source_job_id uuid references public.ml_analysis_jobs(id) on delete set null;
alter table public.ml_feature_snapshots
  add column if not exists source_job_id uuid references public.ml_analysis_jobs(id) on delete cascade;
alter table public.intelligence_events
  add column if not exists source_job_id uuid references public.ml_analysis_jobs(id) on delete set null;

create unique index if not exists trigger_hypotheses_source_job_idx
  on public.trigger_hypotheses(source_job_id) where source_job_id is not null;
create unique index if not exists forecasts_source_job_idx
  on public.forecasts(source_job_id) where source_job_id is not null;
create unique index if not exists forecast_summaries_source_job_idx
  on public.forecast_summaries(source_job_id) where source_job_id is not null;
create unique index if not exists skin_twin_snapshots_source_job_idx
  on public.skin_twin_snapshots(source_job_id) where source_job_id is not null;
create unique index if not exists cutisai_messages_source_job_idx
  on public.cutisai_messages(source_job_id) where source_job_id is not null;
create unique index if not exists ml_feature_snapshots_source_job_idx
  on public.ml_feature_snapshots(source_job_id) where source_job_id is not null;
